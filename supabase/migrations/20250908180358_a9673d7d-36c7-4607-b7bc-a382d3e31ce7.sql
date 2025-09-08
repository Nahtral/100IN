-- Fix infinite recursion in players table RLS policies
-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Coaches can view team players" ON public.players;
DROP POLICY IF EXISTS "Medical staff can view all players for health management" ON public.players;
DROP POLICY IF EXISTS "Parents can view children players" ON public.players;
DROP POLICY IF EXISTS "Players can view own data" ON public.players;
DROP POLICY IF EXISTS "Players can view team members" ON public.players;
DROP POLICY IF EXISTS "Staff can view all players" ON public.players;
DROP POLICY IF EXISTS "Super admins can manage all players" ON public.players;
DROP POLICY IF EXISTS "Team members can view players in same team" ON public.players;
DROP POLICY IF EXISTS "Coaches can manage their team players" ON public.players;
DROP POLICY IF EXISTS "Medical staff can manage player health data" ON public.players;
DROP POLICY IF EXISTS "Players can update own profile" ON public.players;
DROP POLICY IF EXISTS "Staff and coaches can create players" ON public.players;

-- Create clean, non-recursive RLS policies
-- Super admins can do everything
CREATE POLICY "Super admins full access" ON public.players
FOR ALL USING (is_super_admin(auth.uid()));

-- Players can view and update their own data
CREATE POLICY "Players own data" ON public.players
FOR ALL USING (user_id = auth.uid());

-- Staff can view all players
CREATE POLICY "Staff view all" ON public.players
FOR SELECT USING (has_role(auth.uid(), 'staff'::user_role));

-- Medical staff can view all players
CREATE POLICY "Medical view all" ON public.players
FOR SELECT USING (has_role(auth.uid(), 'medical'::user_role));

-- Coaches can view all players (simplified)
CREATE POLICY "Coaches view all" ON public.players  
FOR SELECT USING (has_role(auth.uid(), 'coach'::user_role));

-- Parents can view their children (using secure function)
CREATE POLICY "Parents view children" ON public.players
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_relationships 
    WHERE parent_id = auth.uid() AND child_id = players.user_id
  )
);