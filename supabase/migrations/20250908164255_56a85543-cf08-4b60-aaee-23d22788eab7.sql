-- Fix infinite recursion in players table RLS policies
-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Users can view their own player data" ON public.players;
DROP POLICY IF EXISTS "Players can view their own data" ON public.players;
DROP POLICY IF EXISTS "Admins and staff can view all players" ON public.players;
DROP POLICY IF EXISTS "Super admin can view all players" ON public.players;
DROP POLICY IF EXISTS "Staff can view all players" ON public.players;
DROP POLICY IF EXISTS "Coaches can view players on their teams" ON public.players;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_player_teams()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT team_id) 
  FROM public.players 
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_coach_team_ids(coach_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(DISTINCT id) 
  FROM public.teams 
  WHERE coach_id = coach_user_id;
$$;

-- Create new non-recursive RLS policies for players table
CREATE POLICY "Users can view their own player records"
ON public.players
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all players"
ON public.players
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view all players"
ON public.players
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::public.user_role));

CREATE POLICY "Coaches can view players on their teams"
ON public.players
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::public.user_role) AND
  team_id = ANY(public.get_coach_team_ids(auth.uid()))
);

CREATE POLICY "Medical staff can view all active players"
ON public.players
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'medical'::public.user_role) AND
  is_active = true
);

-- Insert policies
CREATE POLICY "Users can insert their own player records"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can insert any player record"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can insert any player record"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'::public.user_role));

-- Update policies
CREATE POLICY "Users can update their own player records"
ON public.players
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can update any player record"
ON public.players
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can update any player record"
ON public.players
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'staff'::public.user_role));

CREATE POLICY "Coaches can update players on their teams"
ON public.players
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::public.user_role) AND
  team_id = ANY(public.get_coach_team_ids(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'coach'::public.user_role) AND
  team_id = ANY(public.get_coach_team_ids(auth.uid()))
);

-- Delete policies
CREATE POLICY "Super admins can delete any player record"
ON public.players
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can delete any player record"
ON public.players
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::public.user_role));