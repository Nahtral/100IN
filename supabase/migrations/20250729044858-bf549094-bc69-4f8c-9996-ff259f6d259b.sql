-- Drop the existing restrictive policy and create a more permissive one for authenticated users
DROP POLICY IF EXISTS "Coaches and staff can view all players for team management" ON public.players;

-- Allow all authenticated users to view players (for user management purposes)
CREATE POLICY "All authenticated users can view players"
ON public.players
FOR SELECT
TO authenticated
USING (true);