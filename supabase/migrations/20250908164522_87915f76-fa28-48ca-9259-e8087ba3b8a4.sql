-- Fix remaining RLS recursion issues by updating security definer functions
-- The previous functions are still causing recursion, let's make them non-recursive

-- Drop the problematic functions and recreate them properly
DROP FUNCTION IF EXISTS public.get_current_user_player_teams();
DROP FUNCTION IF EXISTS public.get_coach_team_ids(uuid);

-- Create simple, non-recursive functions that don't reference players table
CREATE OR REPLACE FUNCTION public.get_user_team_memberships(target_user_id uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Get team IDs directly from user_roles for coaches
  SELECT COALESCE(array_agg(DISTINCT ur.team_id), ARRAY[]::uuid[])
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id 
    AND ur.is_active = true
    AND ur.team_id IS NOT NULL;
$$;

-- Update the RLS policies to use direct role checks instead of complex subqueries
-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Users can view their own player records" ON public.players;
DROP POLICY IF EXISTS "Super admins can view all players" ON public.players;
DROP POLICY IF EXISTS "Staff can view all players" ON public.players;
DROP POLICY IF EXISTS "Coaches can view players on their teams" ON public.players;
DROP POLICY IF EXISTS "Medical staff can view all active players" ON public.players;

-- Create simplified, non-recursive policies
-- Simple direct user check for own records
CREATE POLICY "players_own_records_select"
ON public.players
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admin access without recursion
CREATE POLICY "players_super_admin_select"
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

-- Staff access without recursion
CREATE POLICY "players_staff_select"
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

-- Coach access - simplified to avoid recursion
CREATE POLICY "players_coach_select"
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

-- Medical staff access
CREATE POLICY "players_medical_select"
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

-- Insert policies - keep them simple
CREATE POLICY "players_own_insert"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "players_admin_insert"
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

-- Update policies
CREATE POLICY "players_own_update"
ON public.players
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "players_admin_update"
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

-- Delete policies  
CREATE POLICY "players_admin_delete"
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