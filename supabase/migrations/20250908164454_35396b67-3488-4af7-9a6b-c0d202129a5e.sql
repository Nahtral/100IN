-- Fix RLS recursion by dropping all dependent objects first
-- Drop all existing policies that might be using the problematic functions
DROP POLICY IF EXISTS "Coaches can view players on their teams" ON public.players;
DROP POLICY IF EXISTS "Coaches can update players on their teams" ON public.players;
DROP POLICY IF EXISTS "Users can view their own player records" ON public.players;
DROP POLICY IF EXISTS "Super admins can view all players" ON public.players;
DROP POLICY IF EXISTS "Staff can view all players" ON public.players;
DROP POLICY IF EXISTS "Medical staff can view all active players" ON public.players;
DROP POLICY IF EXISTS "Users can insert their own player records" ON public.players;
DROP POLICY IF EXISTS "Super admins can insert any player record" ON public.players;
DROP POLICY IF EXISTS "Staff can insert any player record" ON public.players;
DROP POLICY IF EXISTS "Users can update their own player records" ON public.players;
DROP POLICY IF EXISTS "Super admins can update any player record" ON public.players;
DROP POLICY IF EXISTS "Staff can update any player record" ON public.players;
DROP POLICY IF EXISTS "Super admins can delete any player record" ON public.players;
DROP POLICY IF EXISTS "Staff can delete any player record" ON public.players;

-- Now drop the problematic functions
DROP FUNCTION IF EXISTS public.get_current_user_player_teams();
DROP FUNCTION IF EXISTS public.get_coach_team_ids(uuid);

-- Create completely new simplified policies that don't use any complex functions
-- Only use direct, simple checks

-- SELECT policies
CREATE POLICY "players_select_own"
ON public.players
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "players_select_super_admin"
ON public.players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'super_admin'::public.user_role 
      AND ur.is_active = true
  )
);

CREATE POLICY "players_select_staff"
ON public.players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'::public.user_role 
      AND ur.is_active = true
  )
);

CREATE POLICY "players_select_medical"
ON public.players
FOR SELECT
TO authenticated
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'medical'::public.user_role 
      AND ur.is_active = true
  )
);

-- Coach access - use direct team_id check from user_roles
CREATE POLICY "players_select_coach"
ON public.players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'coach'::public.user_role 
      AND ur.is_active = true
      AND ur.team_id = players.team_id
  )
);

-- INSERT policies
CREATE POLICY "players_insert_own"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "players_insert_admin"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin'::public.user_role, 'staff'::public.user_role)
      AND ur.is_active = true
  )
);

-- UPDATE policies
CREATE POLICY "players_update_own"
ON public.players
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "players_update_admin"
ON public.players
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin'::public.user_role, 'staff'::public.user_role)
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin'::public.user_role, 'staff'::public.user_role)
      AND ur.is_active = true
  )
);

CREATE POLICY "players_update_coach"
ON public.players
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'coach'::public.user_role 
      AND ur.is_active = true
      AND ur.team_id = players.team_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'coach'::public.user_role 
      AND ur.is_active = true
      AND ur.team_id = players.team_id
  )
);

-- DELETE policies
CREATE POLICY "players_delete_admin"
ON public.players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin'::public.user_role, 'staff'::public.user_role)
      AND ur.is_active = true
  )
);