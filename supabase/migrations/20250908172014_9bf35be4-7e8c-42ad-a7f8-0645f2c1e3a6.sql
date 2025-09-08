-- Comprehensive fix for infinite recursion in RLS policies (Fixed version)
-- This creates a clean, non-recursive role and team membership system

-- 1. Create simplified role lookup table (no joins to players)
CREATE TABLE IF NOT EXISTS public.user_roles_simple (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin','staff','coach','medical','player','parent','partner')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create team membership table (lightweight, no players dependency)
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id) WHERE is_active = true;

-- 3. Migrate existing role data from user_roles to user_roles_simple
INSERT INTO public.user_roles_simple (user_id, role, is_active, created_at)
SELECT DISTINCT ON (user_id) 
  user_id, 
  role::text, 
  is_active, 
  created_at
FROM public.user_roles 
WHERE is_active = true
ON CONFLICT (user_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 4. Migrate team membership data from players to team_members
INSERT INTO public.team_members (user_id, team_id, is_active, created_at)
SELECT DISTINCT
  p.user_id,
  p.team_id,
  p.is_active,
  p.created_at
FROM public.players p
WHERE p.team_id IS NOT NULL AND p.user_id IS NOT NULL
ON CONFLICT (user_id, team_id) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 5. Create non-recursive helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin_simple(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_simple r 
    WHERE r.user_id = uid AND r.role = 'super_admin' AND r.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_simple(uid uuid, r text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_simple ur 
    WHERE ur.user_id = uid AND ur.role = r AND ur.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_team_with(uid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.user_id = uid AND tm.team_id = team_uuid AND tm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_simple(uid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles_simple 
  WHERE user_id = uid AND is_active = true
  LIMIT 1;
$$;

-- 6. Enable RLS on new tables
ALTER TABLE public.user_roles_simple ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for new tables
CREATE POLICY "Users can view own role" ON public.user_roles_simple
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage roles" ON public.user_roles_simple
FOR ALL USING (is_super_admin_simple(auth.uid()));

CREATE POLICY "Users can view own team memberships" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage team memberships" ON public.team_members
FOR ALL USING (is_super_admin_simple(auth.uid()));

CREATE POLICY "Staff can manage team memberships" ON public.team_members
FOR ALL USING (has_role_simple(auth.uid(), 'staff') OR has_role_simple(auth.uid(), 'coach'));

-- 8. Drop and recreate players RLS policies (non-recursive)
DROP POLICY IF EXISTS "Players can view team players" ON public.players;
DROP POLICY IF EXISTS "Users can view their own player profile" ON public.players;
DROP POLICY IF EXISTS "Super admins can manage all players" ON public.players;
DROP POLICY IF EXISTS "Staff can manage players" ON public.players;
DROP POLICY IF EXISTS "Coaches can view players" ON public.players;
DROP POLICY IF EXISTS "Super admin staff coach medical read all players" ON public.players;
DROP POLICY IF EXISTS "Players read self" ON public.players;
DROP POLICY IF EXISTS "Players read teammates" ON public.players;
DROP POLICY IF EXISTS "Parents read children players" ON public.players;

-- New non-recursive players policies
CREATE POLICY "Super admin staff coach medical read all players" ON public.players
FOR SELECT USING (
  is_super_admin_simple(auth.uid()) OR
  has_role_simple(auth.uid(), 'staff') OR
  has_role_simple(auth.uid(), 'coach') OR
  has_role_simple(auth.uid(), 'medical')
);

CREATE POLICY "Players read self" ON public.players
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Players read teammates" ON public.players
FOR SELECT USING (
  has_role_simple(auth.uid(), 'player') AND
  team_id IS NOT NULL AND
  shares_team_with(auth.uid(), team_id)
);

CREATE POLICY "Parents read children players" ON public.players
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    WHERE pcr.parent_id = auth.uid() AND pcr.child_id = user_id
  )
);

CREATE POLICY "Super admins manage players" ON public.players
FOR ALL USING (is_super_admin_simple(auth.uid()));

CREATE POLICY "Staff manage players" ON public.players
FOR ALL USING (has_role_simple(auth.uid(), 'staff'));

-- 9. Add RLS for schedules (player visibility)
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Super admins can manage all schedules" ON public.schedules;
DROP POLICY IF EXISTS "Staff can manage schedules" ON public.schedules;
DROP POLICY IF EXISTS "Super admin staff coach read all schedules" ON public.schedules;
DROP POLICY IF EXISTS "Players read team schedules" ON public.schedules;
DROP POLICY IF EXISTS "Parents read children schedules" ON public.schedules;

CREATE POLICY "Super admin staff coach read all schedules" ON public.schedules
FOR SELECT USING (
  is_super_admin_simple(auth.uid()) OR
  has_role_simple(auth.uid(), 'staff') OR
  has_role_simple(auth.uid(), 'coach')
);

CREATE POLICY "Players read team schedules" ON public.schedules
FOR SELECT USING (
  has_role_simple(auth.uid(), 'player') AND
  (
    team_ids IS NULL OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true
        AND tm.team_id = ANY(team_ids)
    )
  )
);

CREATE POLICY "Parents read children schedules" ON public.schedules
FOR SELECT USING (
  has_role_simple(auth.uid(), 'parent') AND
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    JOIN public.team_members tm ON pcr.child_id = tm.user_id
    WHERE pcr.parent_id = auth.uid()
      AND tm.is_active = true
      AND (team_ids IS NULL OR tm.team_id = ANY(team_ids))
  )
);

CREATE POLICY "Super admins manage schedules" ON public.schedules
FOR ALL USING (is_super_admin_simple(auth.uid()));

-- 10. Add RLS for teams (player visibility) - Fixed ambiguous column reference
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Super admins can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Super admin staff coach read all teams" ON public.teams;
DROP POLICY IF EXISTS "Players read own teams" ON public.teams;
DROP POLICY IF EXISTS "Parents read children teams" ON public.teams;

CREATE POLICY "Super admin staff coach read all teams" ON public.teams
FOR SELECT USING (
  is_super_admin_simple(auth.uid()) OR
  has_role_simple(auth.uid(), 'staff') OR
  has_role_simple(auth.uid(), 'coach')
);

CREATE POLICY "Players read own teams" ON public.teams
FOR SELECT USING (
  has_role_simple(auth.uid(), 'player') AND
  shares_team_with(auth.uid(), teams.id)
);

CREATE POLICY "Parents read children teams" ON public.teams
FOR SELECT USING (
  has_role_simple(auth.uid(), 'parent') AND
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships pcr
    JOIN public.team_members tm ON pcr.child_id = tm.user_id
    WHERE pcr.parent_id = auth.uid()
      AND tm.team_id = teams.id
      AND tm.is_active = true
  )
);

CREATE POLICY "Super admins manage teams" ON public.teams
FOR ALL USING (is_super_admin_simple(auth.uid()));

-- 11. Create dashboard health check RPC
CREATE OR REPLACE FUNCTION public.rpc_dashboard_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Quick health check without complex joins
  result := jsonb_build_object(
    'status', 'healthy',
    'timestamp', now(),
    'user_id', auth.uid(),
    'role', get_user_role_simple(auth.uid()),
    'is_super_admin', is_super_admin_simple(auth.uid()),
    'team_count', (SELECT COUNT(*) FROM team_members WHERE user_id = auth.uid() AND is_active = true)
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'timestamp', now()
  );
END;
$$;

-- 12. Create optimized user auth data RPC (non-recursive)
CREATE OR REPLACE FUNCTION public.get_user_auth_data_simple(target_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  user_role text;
  is_admin boolean := false;
  team_ids uuid[];
BEGIN
  -- Get profile data
  SELECT 
    p.id, p.email, p.full_name, p.phone, p.approval_status,
    p.rejection_reason, p.latest_tryout_total, p.latest_tryout_placement,
    p.latest_tryout_date
  INTO user_profile
  FROM public.profiles p
  WHERE p.id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'profile', null,
      'role', null,
      'isSuperAdmin', false,
      'isApproved', false,
      'teamIds', '[]'::jsonb,
      'error', 'Profile not found'
    );
  END IF;

  -- Get role from simple table
  SELECT role INTO user_role 
  FROM public.user_roles_simple 
  WHERE user_id = target_user_id AND is_active = true;

  -- Check if super admin
  is_admin := (user_role = 'super_admin');

  -- Get team memberships
  SELECT array_agg(tm.team_id) INTO team_ids
  FROM public.team_members tm
  WHERE tm.user_id = target_user_id AND tm.is_active = true;

  RETURN jsonb_build_object(
    'profile', row_to_json(user_profile),
    'role', COALESCE(user_role, 'player'),
    'isSuperAdmin', is_admin,
    'isApproved', (user_profile.approval_status = 'approved' OR is_admin),
    'teamIds', COALESCE(array_to_json(team_ids), '[]'::json),
    'error', null
  );
END;
$$;

-- Grant permissions
GRANT SELECT ON public.user_roles_simple TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_simple(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_simple(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_team_with(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_simple(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_auth_data_simple(uuid) TO authenticated;