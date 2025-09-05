-- Fix function reference - use existing function name
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Super admins can manage user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Super admins can manage role permissions" ON public.role_permissions;

-- Create the updated policies using existing function names
CREATE POLICY "Users can view their own permissions" ON public.user_permissions
    FOR SELECT TO authenticated USING (
        auth.uid() = user_id OR 
        user_has_permission(auth.uid(), 'manage_users') OR 
        is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage user permissions" ON public.user_permissions
    FOR ALL TO authenticated USING (
        user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())
    );

CREATE POLICY "Authenticated users can view permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage permissions" ON public.permissions
    FOR ALL TO authenticated USING (
        user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())
    );

CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage role permissions" ON public.role_permissions
    FOR ALL TO authenticated USING (
        user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())
    );