-- Registration visibility hardening: profiles trigger, RLS, view/RPC, backfill, diagnostics
-- Idempotent, safe, and RLS-aware

-- 1) Ensure profiles table exists with required columns (aligning with current schema)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  preferred_role text CHECK (preferred_role IN ('player','parent','coach','staff','medical','partner')),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add any missing columns (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='approved_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN approved_by uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='approved_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- 2) Enable RLS (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Profiles policies (create if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_read_admin'
  ) THEN
    CREATE POLICY profiles_read_admin ON public.profiles
      FOR SELECT USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_admin'
  ) THEN
    CREATE POLICY profiles_update_admin ON public.profiles
      FOR UPDATE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role))
      WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_admin'
  ) THEN
    CREATE POLICY profiles_insert_admin ON public.profiles
      FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_read_owner'
  ) THEN
    CREATE POLICY profiles_read_owner ON public.profiles
      FOR SELECT USING (id = auth.uid());
  END IF;
END $$;

-- 4) user_roles policies (create if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_read_admin'
  ) THEN
    CREATE POLICY user_roles_read_admin ON public.user_roles
      FOR SELECT USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_read_self'
  ) THEN
    CREATE POLICY user_roles_read_self ON public.user_roles
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- 5) Harden onboarding trigger: never block auth; idempotent; SECURITY DEFINER
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

  -- Seed requested role as inactive when provided
  IF v_role IS NOT NULL THEN
    -- Cast to enum if needed; assume enum user_role exists
    BEGIN
      INSERT INTO public.user_roles(user_id, role, is_active, created_at)
      VALUES (NEW.id, v_role::user_role, false, now())
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN undefined_object THEN
      -- Fallback if enum not present (older schemas using text)
      INSERT INTO public.user_roles(user_id, role, is_active, created_at)
      VALUES (NEW.id, v_role, false, now())
      ON CONFLICT (user_id, role) DO NOTHING;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM pg_notify('onboarding_errors',
    json_build_object('user_id', NEW.id, 'email', NEW.email, 'err', SQLERRM, 'when', now())::text);
  RETURN NEW; -- never block auth
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- 6) Approval view (robust filters; avoids role join)
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

-- 7) RPC wrapper with access control for admins/staff
CREATE OR REPLACE FUNCTION public.rpc_get_pending_users()
RETURNS SETOF public.v_pending_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.v_pending_users;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_pending_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_pending_users() TO authenticated;

-- 8) Diagnostics (non-sensitive): list auth users and whether profile exists
CREATE OR REPLACE FUNCTION public.rpc_diag_orphans()
RETURNS TABLE(user_id uuid, email text, has_profile boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email, (p.id IS NOT NULL) AS has_profile
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_diag_orphans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_diag_orphans() TO authenticated;

-- 9) Backfill: create any missing profiles + seed requested role when present
-- Profiles backfill
INSERT INTO public.profiles (id, email, full_name, approval_status, created_at, updated_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name',''), 'pending', u.created_at, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Seed requested role (inactive) only if no role row exists for that role
DO $$ BEGIN
  -- If user_roles uses enum user_role, cast; else insert as text
  BEGIN
    INSERT INTO public.user_roles(user_id, role, is_active, created_at)
    SELECT u.id, (u.raw_user_meta_data->>'preferred_role')::user_role, false, now()
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.user_roles ur 
      ON ur.user_id = u.id AND ur.role::text = (u.raw_user_meta_data->>'preferred_role')
    WHERE (u.raw_user_meta_data->>'preferred_role') IS NOT NULL AND ur.user_id IS NULL;
  EXCEPTION WHEN undefined_object THEN
    INSERT INTO public.user_roles(user_id, role, is_active, created_at)
    SELECT u.id, (u.raw_user_meta_data->>'preferred_role')::text, false, now()
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.user_roles ur 
      ON ur.user_id = u.id AND ur.role::text = (u.raw_user_meta_data->>'preferred_role')
    WHERE (u.raw_user_meta_data->>'preferred_role') IS NOT NULL AND ur.user_id IS NULL;
  END;
END $$;

-- 10) Touch updated_at trigger for profiles if not present (optional QoL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_profiles_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END; $$ LANGUAGE plpgsql SET search_path = public;

    CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;