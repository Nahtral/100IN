-- Drop and recreate policies for player_performance if they exist
DROP POLICY IF EXISTS "Players can view their own performance" ON public.player_performance;
DROP POLICY IF EXISTS "Staff and coaches can view all performance" ON public.player_performance;
DROP POLICY IF EXISTS "Staff and coaches can manage performance" ON public.player_performance;

-- Recreate RLS Policies for player_performance
CREATE POLICY "Players can view their own performance" ON public.player_performance
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.players WHERE id = player_performance.player_id AND user_id = auth.uid())
);

CREATE POLICY "Staff and coaches can view all performance" ON public.player_performance
FOR SELECT USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Staff and coaches can manage performance" ON public.player_performance
FOR ALL USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);