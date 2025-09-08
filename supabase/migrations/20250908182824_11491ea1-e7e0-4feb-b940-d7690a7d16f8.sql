-- COMPLETE NUCLEAR RESET: Drop ALL RLS policies on players table
-- This addresses the 40 conflicting policies causing infinite recursion

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on players table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'players'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.players', pol.policyname);
    END LOOP;
END $$;

-- Create simple, clean RLS policies with no recursive queries
-- Policy 1: Super admins have full access
CREATE POLICY "super_admin_full_access" 
ON public.players FOR ALL 
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

-- Policy 2: Players can view their own data
CREATE POLICY "players_own_data" 
ON public.players FOR SELECT 
USING (user_id = auth.uid());

-- Policy 3: Medical staff can view player data
CREATE POLICY "medical_view_players" 
ON public.players FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles_simple 
    WHERE user_id = auth.uid() 
    AND role = 'medical' 
    AND is_active = true
  )
);

-- Policy 4: Staff can view player data  
CREATE POLICY "staff_view_players" 
ON public.players FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles_simple 
    WHERE user_id = auth.uid() 
    AND role = 'staff' 
    AND is_active = true
  )
);

-- Policy 5: Coaches can view player data
CREATE POLICY "coaches_view_players" 
ON public.players FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles_simple 
    WHERE user_id = auth.uid() 
    AND role = 'coach' 
    AND is_active = true
  )
);