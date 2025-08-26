-- Create a more permissive RLS policy for attendance tracking
-- This allows staff, coaches, and super admins to view players for attendance purposes

CREATE POLICY "Allow attendance tracking for players" 
ON public.players 
FOR SELECT 
USING (
  -- Super admins can see all players
  is_super_admin(auth.uid()) OR
  -- Staff can see all players
  has_role(auth.uid(), 'staff'::user_role) OR
  -- Coaches can see all players (not just their team, for multi-team events)
  has_role(auth.uid(), 'coach'::user_role) OR
  -- Players can see their own data (if they have user accounts)
  (user_id IS NOT NULL AND auth.uid() = user_id) OR
  -- Parents can see their children's data
  (user_id IS NOT NULL AND EXISTS ( 
    SELECT 1 FROM parent_child_relationships 
    WHERE parent_id = auth.uid() AND child_id = user_id
  )) OR
  -- Medical staff can see players for medical purposes
  has_role(auth.uid(), 'medical'::user_role) OR
  -- Partners can see sponsored team players
  (has_role(auth.uid(), 'partner'::user_role) AND EXISTS ( 
    SELECT 1 FROM partner_team_sponsorships pts
    JOIN partner_organizations po ON pts.partner_organization_id = po.id
    WHERE po.created_by = auth.uid() 
      AND pts.team_id = players.team_id 
      AND pts.status = 'active'
      AND pts.start_date <= CURRENT_DATE 
      AND (pts.end_date IS NULL OR pts.end_date >= CURRENT_DATE)
  ))
);

-- Remove the old restrictive policies that might be conflicting
DROP POLICY IF EXISTS "Players can view their own data" ON public.players;
DROP POLICY IF EXISTS "Parents can view their children's data" ON public.players;
DROP POLICY IF EXISTS "Coaches can view their team players" ON public.players;
DROP POLICY IF EXISTS "Team members can view same team players" ON public.players;
DROP POLICY IF EXISTS "Medical staff can view players for medical purposes" ON public.players;
DROP POLICY IF EXISTS "Partners can view sponsored team players only" ON public.players;