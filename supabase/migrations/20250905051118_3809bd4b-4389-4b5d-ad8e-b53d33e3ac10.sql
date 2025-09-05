-- Migration: Implement Granular Permission Management System
-- This migration normalizes permissions, sets proper defaults, and creates audit trails

-- 1. Create audit table for permission changes
CREATE TABLE IF NOT EXISTS public.permission_migration_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_permissions JSONB,
    new_permissions JSONB,
    migration_reason TEXT DEFAULT 'system_migration',
    migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    migrated_by UUID DEFAULT auth.uid()
);

-- 2. Seed canonical permissions (idempotent)
INSERT INTO public.permissions (name, description, category) VALUES
    ('manage_attendance', 'Manage player attendance tracking', 'operations'),
    ('manage_stats', 'Manage player statistics and analytics', 'analytics'),
    ('manage_training', 'Manage training sessions and programs', 'training'),
    ('manage_teams', 'Manage team rosters and assignments', 'teams'),
    ('manage_users', 'Manage user accounts and roles', 'administration'),
    ('view_reports', 'View system reports and analytics', 'analytics'),
    ('manage_players', 'Add and manage player profiles', 'players'),
    ('manage_schedules', 'Manage event schedules', 'operations'),
    ('manage_medical', 'Access medical and health data', 'medical'),
    ('manage_partnerships', 'Manage partner relationships', 'partnerships')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- 3. Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Backup current permission state before migration
INSERT INTO public.permission_migration_audit (user_id, old_permissions, migration_reason)
SELECT 
    ur.user_id,
    jsonb_build_object(
        'roles', json_agg(DISTINCT ur.role),
        'user_permissions', COALESCE((
            SELECT json_agg(p.name) 
            FROM public.user_permissions up 
            JOIN public.permissions p ON up.permission_id = p.id 
            WHERE up.user_id = ur.user_id AND up.is_active = true
        ), '[]'::json)
    ),
    'pre_migration_backup'
FROM public.user_roles ur
WHERE ur.is_active = true
GROUP BY ur.user_id;

-- 5. Clear existing role_permissions to start fresh
DELETE FROM public.role_permissions;

-- 6. Set default role permissions
-- Staff gets only manage_attendance
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'staff'::user_role, p.id
FROM public.permissions p
WHERE p.name = 'manage_attendance';

-- Super admin gets all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin'::user_role, p.id
FROM public.permissions p;

-- Coach gets minimal permissions (can be expanded by super admin)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'coach'::user_role, p.id
FROM public.permissions p
WHERE p.name IN ('manage_attendance', 'view_reports');

-- Medical gets medical permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'medical'::user_role, p.id
FROM public.permissions p
WHERE p.name IN ('manage_medical', 'view_reports');

-- 7. Clean up user_permissions - remove auto-granted ones, keep explicit super admin grants
-- Mark old auto-granted permissions for removal
UPDATE public.user_permissions 
SET is_active = false,
    revoked_at = NOW(),
    reason = COALESCE(reason, '') || ' - Revoked during permission migration'
WHERE is_active = true 
  AND (granted_by IS NULL OR granted_by NOT IN (
    SELECT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'super_admin' AND ur.is_active = true
  ));

-- 8. Create view for effective permissions
CREATE OR REPLACE VIEW public.vw_effective_permissions AS
WITH user_role_permissions AS (
    -- Get permissions from roles
    SELECT 
        ur.user_id,
        p.name as permission_name,
        p.description as permission_description,
        'role'::text as source,
        ur.role::text as source_detail,
        true as is_granted
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.is_active = true
),
user_direct_permissions AS (
    -- Get direct user permissions
    SELECT 
        up.user_id,
        p.name as permission_name,
        p.description as permission_description,
        'direct'::text as source,
        'user_permission'::text as source_detail,
        up.is_active as is_granted
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.is_active = true
)
SELECT 
    user_id,
    permission_name,
    permission_description,
    source,
    source_detail,
    is_granted
FROM user_role_permissions
UNION ALL
SELECT 
    user_id,
    permission_name,
    permission_description,
    source,
    source_detail,
    is_granted
FROM user_direct_permissions;

-- 9. Create function to check effective permissions
CREATE OR REPLACE FUNCTION public.fn_user_has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Check if user is super admin (bypass all checks)
    SELECT CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = _user_id 
            AND ur.role = 'super_admin' 
            AND ur.is_active = true
        ) THEN true
        ELSE EXISTS (
            SELECT 1 FROM public.vw_effective_permissions ep
            WHERE ep.user_id = _user_id 
            AND ep.permission_name = _permission_name 
            AND ep.is_granted = true
        )
    END;
$$;

-- 10. Create function to get user's effective permissions
CREATE OR REPLACE FUNCTION public.fn_get_user_effective_permissions(_user_id UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT, source TEXT, source_detail TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT 
        ep.permission_name,
        ep.permission_description,
        ep.source,
        ep.source_detail
    FROM public.vw_effective_permissions ep
    WHERE ep.user_id = _user_id 
    AND ep.is_granted = true
    ORDER BY ep.permission_name;
$$;

-- 11. Update RLS policies for permission tables

-- Permissions table - allow read for authenticated, write for super admin only
DROP POLICY IF EXISTS "Super admins can manage permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage permissions" ON public.permissions
    FOR ALL TO authenticated USING (
        fn_user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())
    );

-- Role permissions table - read for authenticated, write for super admin only
DROP POLICY IF EXISTS "Super admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage role permissions" ON public.role_permissions
    FOR ALL TO authenticated USING (
        fn_user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())
    );

-- User permissions table - tighten write access
DROP POLICY IF EXISTS "Super admins can manage user permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions" ON public.user_permissions
    FOR SELECT TO authenticated USING (
        auth.uid() = user_id OR 
        fn_user_has_permission(auth.uid(), 'manage_users') OR 
        is_super_admin(auth.uid())
    );

CREATE POLICY "Super admins can manage user permissions" ON public.user_permissions
    FOR ALL TO authenticated USING (
        fn_user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())
    );

-- 12. Create function to grant permission to user
CREATE OR REPLACE FUNCTION public.fn_grant_user_permission(
    _target_user_id UUID,
    _permission_name TEXT,
    _reason TEXT DEFAULT 'Granted by super admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _permission_id UUID;
    _result JSON;
BEGIN
    -- Only super admins can grant permissions
    IF NOT (fn_user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())) THEN
        RETURN json_build_object('success', false, 'error', 'Access denied');
    END IF;

    -- Get permission ID
    SELECT id INTO _permission_id FROM public.permissions WHERE name = _permission_name;
    IF _permission_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Permission not found');
    END IF;

    -- Insert or activate permission
    INSERT INTO public.user_permissions (
        user_id, permission_id, granted_by, granted_at, is_active, reason
    ) VALUES (
        _target_user_id, _permission_id, auth.uid(), NOW(), true, _reason
    )
    ON CONFLICT (user_id, permission_id) DO UPDATE SET
        is_active = true,
        granted_by = auth.uid(),
        granted_at = NOW(),
        revoked_at = NULL,
        reason = _reason;

    -- Log the action
    INSERT INTO public.analytics_events (
        user_id, event_type, event_data, created_at
    ) VALUES (
        auth.uid(),
        'permission_granted',
        json_build_object(
            'target_user_id', _target_user_id,
            'permission_name', _permission_name,
            'reason', _reason
        ),
        NOW()
    );

    RETURN json_build_object('success', true, 'message', 'Permission granted successfully');
END;
$$;

-- 13. Create function to revoke permission from user
CREATE OR REPLACE FUNCTION public.fn_revoke_user_permission(
    _target_user_id UUID,
    _permission_name TEXT,
    _reason TEXT DEFAULT 'Revoked by super admin'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _permission_id UUID;
    _result JSON;
BEGIN
    -- Only super admins can revoke permissions
    IF NOT (fn_user_has_permission(auth.uid(), 'manage_users') OR is_super_admin(auth.uid())) THEN
        RETURN json_build_object('success', false, 'error', 'Access denied');
    END IF;

    -- Get permission ID
    SELECT id INTO _permission_id FROM public.permissions WHERE name = _permission_name;
    IF _permission_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Permission not found');
    END IF;

    -- Revoke permission
    UPDATE public.user_permissions 
    SET is_active = false,
        revoked_at = NOW(),
        reason = COALESCE(reason, '') || ' - ' || _reason
    WHERE user_id = _target_user_id 
    AND permission_id = _permission_id;

    -- Log the action
    INSERT INTO public.analytics_events (
        user_id, event_type, event_data, created_at
    ) VALUES (
        auth.uid(),
        'permission_revoked',
        json_build_object(
            'target_user_id', _target_user_id,
            'permission_name', _permission_name,
            'reason', _reason
        ),
        NOW()
    );

    RETURN json_build_object('success', true, 'message', 'Permission revoked successfully');
END;
$$;