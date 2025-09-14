-- Registration visibility hardening: profiles trigger, RLS, view/RPC, backfill, diagnostics
-- Simplified version without dynamic casting

-- 1) Ensure profiles table exists with required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 2) Enable RLS (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Create/replace hardened trigger with SECURITY DEFINER
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
  -- Profile upsert (idempotent)
  INSERT INTO public.profiles (id, email, full_name, phone, preferred_role, approval_status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_name, v_phone, v_role, 'pending', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    preferred_role = COALESCE(EXCLUDED.preferred_role, public.profiles.preferred_role),
    updated_at = now();

  -- Seed requested role as inactive when provided (using existing enum)
  IF v_role IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role, is_active, created_at)
    VALUES (NEW.id, v_role::user_role, false, now())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log errors but never block auth
  PERFORM pg_notify('onboarding_errors',
    json_build_object('user_id', NEW.id, 'email', NEW.email, 'err', SQLERRM, 'when', now())::text);
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Approval view (robust, doesn't depend on role joins)
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

-- 5) RPC wrapper with access control
CREATE OR REPLACE FUNCTION public.rpc_get_pending_users()
RETURNS SETOF public.v_pending_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: super admin or staff role required';
  END IF;
  RETURN QUERY SELECT * FROM public.v_pending_users;
END;
$$;

-- 6) Diagnostic RPC for finding orphaned users
CREATE OR REPLACE FUNCTION public.rpc_diag_orphans()
RETURNS TABLE(user_id uuid, email text, has_profile boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: super admin or staff role required';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email, (p.id IS NOT NULL) AS has_profile
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- 7) Backfill missing profiles
INSERT INTO public.profiles (id, email, full_name, approval_status, created_at, updated_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name',''), 'pending', u.created_at, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 8) Backfill missing user roles for those with preferred_role in metadata
INSERT INTO public.user_roles(user_id, role, is_active, created_at)
SELECT u.id, (u.raw_user_meta_data->>'preferred_role')::user_role, false, now()
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role::text = (u.raw_user_meta_data->>'preferred_role')
WHERE (u.raw_user_meta_data->>'preferred_role') IS NOT NULL 
  AND ur.user_id IS NULL
  AND (u.raw_user_meta_data->>'preferred_role') IN ('player','parent','coach','staff','medical','partner');

-- 9) Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();