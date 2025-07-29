-- Add policy to allow coaches and staff to view all players for team management
CREATE POLICY "Coaches and staff can view all players for team management"
ON public.players
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);