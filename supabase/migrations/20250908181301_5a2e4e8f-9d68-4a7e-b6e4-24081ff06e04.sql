-- Complete RLS Policy Reset for Players Table
-- Drop ALL existing policies on players table to eliminate conflicts

DROP POLICY IF EXISTS "Super admins can manage all players" ON public.players;
DROP POLICY IF EXISTS "Players can view own profile" ON public.players;
DROP POLICY IF EXISTS "Super admins can view all players" ON public.players;
DROP POLICY IF EXISTS "Coaches can view team players" ON public.players;
DROP POLICY IF EXISTS "Parents can view children" ON public.players;
DROP POLICY IF EXISTS "Staff can view players" ON public.players;
DROP POLICY IF EXISTS "Players can update own info" ON public.players;
DROP POLICY IF EXISTS "Admins can manage players" ON public.players;
DROP POLICY IF EXISTS "Team members can view players" ON public.players;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.players;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.players;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.players;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.players;

-- Create ONE simple, non-recursive policy using direct query
CREATE POLICY "super_admins_full_access" ON public.players
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles_simple 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles_simple 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);