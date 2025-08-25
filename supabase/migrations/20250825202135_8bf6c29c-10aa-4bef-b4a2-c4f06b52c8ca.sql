-- Fix infinite recursion by creating security definer functions and updating RLS policies

-- First, create a function to safely get current user's team
CREATE OR REPLACE FUNCTION public.get_current_user_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT team_id FROM public.players WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Create a function to check if user is in same team
CREATE OR REPLACE FUNCTION public.is_same_team_member(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players 
    WHERE user_id = auth.uid() 
      AND team_id = _team_id 
      AND is_active = true
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team members can view players from same team" ON public.players;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "Team members can view same team players"
ON public.players 
FOR SELECT 
USING (public.is_same_team_member(team_id));

-- Also fix the medical staff policy which has redundant checks
DROP POLICY IF EXISTS "Medical staff can view players for medical purposes" ON public.players;

CREATE POLICY "Medical staff can view players for medical purposes"
ON public.players 
FOR SELECT 
USING (has_role(auth.uid(), 'medical'::user_role));