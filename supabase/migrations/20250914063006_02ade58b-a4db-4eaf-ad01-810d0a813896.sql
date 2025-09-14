-- Registration visibility hardening fix
-- Profile trigger hardening, RLS policies, view/RPC creation, backfill

-- 1) Add missing columns to profiles table if needed (idempotent)
DO $missing_columns$ 
BEGIN
  -- Add email column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
  
  -- Add approved_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='approved_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN approved_by uuid;
  END IF;
  
  -- Add approved_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='approved_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN approved_at timestamptz;
  END IF;
END $missing_columns$;

-- 2) Enable RLS (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Create profiles policies if they don't exist
DROP POLICY IF EXISTS profiles_read_admin ON public.profiles;
CREATE POLICY profiles_read_admin ON public.profiles
  FOR SELECT USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role))
  WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

DROP POLICY IF EXISTS profiles_read_owner ON public.profiles;
CREATE POLICY profiles_read_owner ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- 4) Create user_roles policies if they don't exist
DROP POLICY IF EXISTS user_roles_read_admin ON public.user_roles;
CREATE POLICY user_roles_read_admin ON public.user_roles
  FOR SELECT USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

DROP POLICY IF EXISTS user_roles_read_self ON public.user_roles;
CREATE POLICY user_roles_read_self ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- 5) Harden onboarding trigger: SECURITY DEFINER + exception handling + idempotent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text := COALESCE(NEW.raw_user_meta_data->>'preferred_role', NULL);
  v_name  text := COALESCE(NEW.raw_user_meta_data->>'full_name', NULL);
  v_phone text := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);
BEGIN
  -- Profile upsert (always succeeds, idempotent)
  INSERT INTO public.profiles (id, email, full_name, phone, preferred_role, approval_status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_name, v_phone, v_role, 'pending', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    preferred_role = COALESCE(EXCLUDED.preferred_role, public.profiles.preferred_role),
    updated_at = now();

  -- Seed requested role as inactive when provided
  IF v_role IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role, is_active, created_at)
    VALUES (NEW.id, v_role::user_role, false, now())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log errors but NEVER block auth user creation
  PERFORM pg_notify('onboarding_errors',
    json_build_object('user_id', NEW.id, 'email', NEW.email, 'error', SQLERRM, 'timestamp', now())::text);
  RETURN NEW; -- Critical: always return NEW to allow auth success
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Create pending users view (robust, no complex joins)
CREATE OR REPLACE VIEW public.v_pending_users AS
SELECT 
  p.id AS user_id,
  COALESCE(p.full_name, u.email) AS full_name,
  u.email,
  p.preferred_role,
  p.approval_status,
  p.created_at,
  p.updated_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;

-- 7) Create RPC for fetching pending users (admin-only access)
CREATE OR REPLACE FUNCTION public.rpc_get_pending_users()
RETURNS SETOF public.v_pending_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins and staff can view pending users
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: requires super admin or staff role';
  END IF;
  
  RETURN QUERY SELECT * FROM public.v_pending_users;
END;
$$;

-- 8) Create diagnostic RPC for orphaned auth users
CREATE OR REPLACE FUNCTION public.rpc_diag_orphans()
RETURNS TABLE(user_id uuid, email text, has_profile boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins and staff can run diagnostics
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: requires super admin or staff role';
  END IF;
  
  RETURN QUERY
  SELECT u.id, u.email, (p.id IS NOT NULL) AS has_profile
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- 9) Backfill any missing profiles from existing auth users
INSERT INTO public.profiles (id, email, full_name, approval_status, created_at, updated_at)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', ''), 
  'pending', 
  u.created_at, 
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 10) Backfill any missing user roles for users with preferred_role metadata
INSERT INTO public.user_roles(user_id, role, is_active, created_at)
SELECT 
  u.id, 
  (u.raw_user_meta_data->>'preferred_role')::user_role, 
  false, 
  now()
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role::text = (u.raw_user_meta_data->>'preferred_role')
WHERE (u.raw_user_meta_data->>'preferred_role') IS NOT NULL 
  AND ur.user_id IS NULL
  AND (u.raw_user_meta_data->>'preferred_role') IN ('player','parent','coach','staff','medical','partner','super_admin');

-- 11) Create updated_at trigger for profiles if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();