-- Remove the problematic RLS policy that incorrectly checks user_roles.team_id
DROP POLICY IF EXISTS "Coaches can view player profiles for attendance" ON public.profiles;

-- Update the comprehensive profile access policy to correctly handle coach-team relationships
DROP POLICY IF EXISTS "Comprehensive profile access policy" ON public.profiles;

-- Create the corrected policy that uses teams.coach_id and player_teams table
CREATE POLICY "Coaches can view their team players profiles" ON public.profiles
FOR SELECT 
USING (
  -- Super admins can see all
  is_super_admin(auth.uid())
  OR
  -- Staff can see all  
  has_role(auth.uid(), 'staff'::user_role)
  OR
  -- Medical can see all
  has_role(auth.uid(), 'medical'::user_role)
  OR
  -- Users can see their own profile
  (id = auth.uid())
  OR
  -- Parents can see their children's profiles
  (EXISTS (
    SELECT 1 FROM parent_child_relationships pcr 
    WHERE pcr.parent_id = auth.uid() AND pcr.child_id = id
  ))
  OR
  -- Coaches can see player profiles for teams they coach
  (has_role(auth.uid(), 'coach'::user_role) 
   AND EXISTS (
     SELECT 1 FROM players p
     JOIN player_teams pt ON p.id = pt.player_id  
     JOIN teams t ON pt.team_id = t.id
     WHERE p.user_id = profiles.id
     AND t.coach_id = auth.uid()
     AND p.is_active = true 
     AND pt.is_active = true
     AND t.is_active = true
   ))
);