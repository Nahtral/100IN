-- Enhanced User Management Backend Fixes
-- Fix Option 2: Backend-Focused Database & RPC Improvements

-- 1. Create enhanced user management RPC functions
CREATE OR REPLACE FUNCTION public.rpc_user_management_action(
  p_action text,
  p_target_user_id uuid,
  p_role text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_performed_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  user_exists boolean;
  target_profile RECORD;
BEGIN
  -- Only super admins can perform user management actions
  IF NOT is_super_admin(p_performed_by) THEN
    RAISE EXCEPTION 'Only super admins can perform user management actions';
  END IF;

  -- Check if target user exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_target_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get target user profile
  SELECT * INTO target_profile FROM profiles WHERE id = p_target_user_id;

  CASE p_action
    WHEN 'assign_role' THEN
      -- Assign role with validation
      IF p_role IS NULL THEN
        RAISE EXCEPTION 'Role is required for assign_role action';
      END IF;
      
      INSERT INTO public.user_roles (
        user_id, role, is_active, created_at, approved_by, approved_at, team_id
      )
      VALUES (
        p_target_user_id, p_role::user_role, true, now(), p_performed_by, now(), NULL
      )
      ON CONFLICT (user_id, role) 
      DO UPDATE SET 
        is_active = true, 
        created_at = now(),
        approved_by = p_performed_by,
        approved_at = now();

      result := json_build_object(
        'success', true,
        'message', 'Role assigned successfully',
        'action', 'assign_role',
        'role', p_role,
        'user_id', p_target_user_id
      );

    WHEN 'revoke_role' THEN
      -- Revoke role
      IF p_role IS NULL THEN
        RAISE EXCEPTION 'Role is required for revoke_role action';
      END IF;
      
      UPDATE public.user_roles 
      SET is_active = false, created_at = now()
      WHERE user_id = p_target_user_id AND role = p_role::user_role;

      result := json_build_object(
        'success', true,
        'message', 'Role revoked successfully',
        'action', 'revoke_role',
        'role', p_role,
        'user_id', p_target_user_id
      );

    WHEN 'reactivate_user' THEN
      -- Reactivate user with full workflow restoration
      UPDATE public.profiles 
      SET 
        approval_status = 'approved',
        rejection_reason = NULL,
        updated_at = now(),
        approved_by = p_performed_by,
        approved_at = now()
      WHERE id = p_target_user_id;

      -- Reactivate all previous roles
      UPDATE public.user_roles 
      SET 
        is_active = true,
        approved_by = p_performed_by,
        approved_at = now()
      WHERE user_id = p_target_user_id;

      -- If user doesn't have any roles, assign player role by default
      IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_target_user_id) THEN
        INSERT INTO public.user_roles (
          user_id, role, is_active, created_at, approved_by, approved_at, team_id
        ) VALUES (
          p_target_user_id, 'player', true, now(), p_performed_by, now(), NULL
        );
      END IF;

      result := json_build_object(
        'success', true,
        'message', 'User reactivated successfully',
        'action', 'reactivate_user',
        'user_id', p_target_user_id
      );

    WHEN 'delete_user' THEN
      -- Soft delete with cascade cleanup
      -- First deactivate all roles
      UPDATE public.user_roles 
      SET is_active = false 
      WHERE user_id = p_target_user_id;

      -- Deactivate player record if exists
      UPDATE public.players 
      SET 
        is_active = false, 
        deactivation_reason = 'User deleted',
        updated_at = now()
      WHERE user_id = p_target_user_id;

      -- Mark profile as deleted (soft delete)
      UPDATE public.profiles 
      SET 
        approval_status = 'rejected',
        rejection_reason = COALESCE(p_reason, 'User deleted by admin'),
        updated_at = now(),
        full_name = '[DELETED] ' || full_name,
        email = 'deleted_' || EXTRACT(EPOCH FROM now())::text || '@deleted.local'
      WHERE id = p_target_user_id;

      result := json_build_object(
        'success', true,
        'message', 'User deleted successfully',
        'action', 'delete_user',
        'user_id', p_target_user_id
      );

    WHEN 'archive_user' THEN
      -- Archive user
      UPDATE public.profiles 
      SET 
        approval_status = 'rejected',
        rejection_reason = COALESCE(p_reason, 'User archived'),
        updated_at = now()
      WHERE id = p_target_user_id;

      result := json_build_object(
        'success', true,
        'message', 'User archived successfully',
        'action', 'archive_user',
        'user_id', p_target_user_id
      );

    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    p_performed_by, 
    'user_management_action',
    jsonb_build_object(
      'action', p_action,
      'target_user_id', p_target_user_id,
      'target_user_email', target_profile.email,
      'role', p_role,
      'reason', p_reason,
      'timestamp', now()
    ),
    now()
  );

  RETURN result;
END;
$$;

-- 2. Create bulk user operations RPC
CREATE OR REPLACE FUNCTION public.rpc_bulk_user_operations(
  p_action text,
  p_user_ids uuid[],
  p_role text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_performed_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id uuid;
  success_count integer := 0;
  error_count integer := 0;
  errors text[] := '{}';
  result json;
BEGIN
  -- Only super admins can perform bulk operations
  IF NOT is_super_admin(p_performed_by) THEN
    RAISE EXCEPTION 'Only super admins can perform bulk operations';
  END IF;

  -- Process each user
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    BEGIN
      -- Call individual user management action
      SELECT rpc_user_management_action(
        p_action, user_id, p_role, p_reason, p_performed_by
      ) INTO result;
      
      success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      errors := array_append(errors, user_id::text || ': ' || SQLERRM);
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', error_count = 0,
    'success_count', success_count,
    'error_count', error_count,
    'errors', array_to_json(errors),
    'message', CASE 
      WHEN error_count = 0 THEN 'All operations completed successfully'
      WHEN success_count = 0 THEN 'All operations failed'
      ELSE 'Partial success: ' || success_count || ' completed, ' || error_count || ' failed'
    END
  );
END;
$$;

-- 3. Create enhanced user details RPC
CREATE OR REPLACE FUNCTION public.rpc_get_user_details_enhanced(
  p_user_id uuid,
  p_requested_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  user_profile RECORD;
  user_roles_data json;
  user_permissions_data json;
  user_audit_log json;
BEGIN
  -- Only super admins can view detailed user information
  IF NOT is_super_admin(p_requested_by) THEN
    RAISE EXCEPTION 'Only super admins can view detailed user information';
  END IF;

  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get user roles
  SELECT json_agg(
    json_build_object(
      'role', role,
      'is_active', is_active,
      'created_at', created_at,
      'approved_by', approved_by,
      'approved_at', approved_at
    )
  ) INTO user_roles_data
  FROM user_roles
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;

  -- Get user permissions
  SELECT json_agg(
    json_build_object(
      'permission_name', p.name,
      'permission_description', p.description,
      'source', 'direct',
      'is_active', up.is_active,
      'granted_at', up.granted_at,
      'granted_by', up.granted_by
    )
  ) INTO user_permissions_data
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id;

  -- Get recent audit log
  SELECT json_agg(
    json_build_object(
      'event_type', event_type,
      'event_data', event_data,
      'created_at', created_at
    )
  ) INTO user_audit_log
  FROM analytics_events
  WHERE (event_data->>'target_user_id')::uuid = p_user_id
     OR user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 50;

  result := json_build_object(
    'profile', row_to_json(user_profile),
    'roles', COALESCE(user_roles_data, '[]'::json),
    'permissions', COALESCE(user_permissions_data, '[]'::json),
    'audit_log', COALESCE(user_audit_log, '[]'::json),
    'fetched_at', now()
  );

  RETURN result;
END;
$$;

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analytics_events_target_user ON analytics_events USING GIN((event_data->>'target_user_id'));
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

-- 5. Add constraints for data integrity
ALTER TABLE profiles ADD CONSTRAINT profiles_email_format_check 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 6. Create audit trigger for user management actions
CREATE OR REPLACE FUNCTION audit_user_management_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log profile changes
    IF OLD.approval_status != NEW.approval_status THEN
      INSERT INTO analytics_events (
        user_id, event_type, event_data, created_at
      ) VALUES (
        auth.uid(),
        'profile_status_changed',
        jsonb_build_object(
          'target_user_id', NEW.id,
          'old_status', OLD.approval_status,
          'new_status', NEW.approval_status,
          'reason', NEW.rejection_reason
        ),
        now()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_user_management_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_management_changes();