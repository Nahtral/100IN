-- Registration visibility hardening - simplified version
-- Fix trigger, RLS, view/RPC, backfill

-- 1) Harden onboarding trigger: SECURITY DEFINER + exception handling + idempotent
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
  INSERT INTO public.profiles (id, email, full_name, phone, approval_status, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_name, v_phone, 'pending', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
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

-- 2) Create pending users view (without preferred_role)
CREATE OR REPLACE VIEW public.v_pending_users AS
SELECT 
  p.id AS user_id,
  COALESCE(p.full_name, u.email) AS full_name,
  u.email,
  COALESCE(
    (SELECT role::text FROM public.user_roles ur 
     WHERE ur.user_id = p.id AND ur.is_active = false 
     ORDER BY ur.created_at DESC LIMIT 1), 
    'player'
  ) AS preferred_role,
  p.approval_status,
  p.created_at,
  p.updated_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;

-- 3) Create RPC for fetching pending users (admin-only access)
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

-- 4) Create diagnostic RPC for orphaned auth users
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

-- 5) Backfill any missing profiles from existing auth users
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

-- 6) Backfill any missing user roles for users with preferred_role metadata
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