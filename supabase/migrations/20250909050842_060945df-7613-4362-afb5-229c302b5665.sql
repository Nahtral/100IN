-- Fix A: Add Coach Permission for Attendance
-- Allow coaches to view player profiles for teams they have access to

CREATE POLICY "Coaches can view player profiles for attendance" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow if user is a coach and the profile belongs to a player on a team the coach has access to
  has_role(auth.uid(), 'coach'::user_role) AND 
  EXISTS (
    SELECT 1 
    FROM public.players p
    JOIN public.player_teams pt ON p.id = pt.player_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE p.user_id = profiles.id 
      AND pt.team_id = ur.team_id
      AND ur.role = 'coach'
      AND ur.is_active = true
      AND pt.is_active = true
      AND p.is_active = true
  )
);