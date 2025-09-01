-- Create function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id UUID,
  target_role user_role,
  assigned_by_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can assign roles
  IF NOT is_super_admin(assigned_by_user_id) THEN
    RAISE EXCEPTION 'Only super admins can assign roles';
  END IF;

  -- Insert or update user role
  INSERT INTO public.user_roles (user_id, role, is_active, created_at)
  VALUES (target_user_id, target_role, true, now())
  ON CONFLICT (user_id, role) 
  DO UPDATE SET is_active = true, created_at = now();

  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    assigned_by_user_id, 
    'role_assigned',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'assigned_role', target_role,
      'action_type', 'assign'
    ),
    now()
  );

  RETURN json_build_object('success', true, 'message', 'Role assigned successfully');
END;
$$;

-- Create function to remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role(
  target_user_id UUID,
  target_role user_role,
  removed_by_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can remove roles
  IF NOT is_super_admin(removed_by_user_id) THEN
    RAISE EXCEPTION 'Only super admins can remove roles';
  END IF;

  -- Update user role to inactive
  UPDATE public.user_roles 
  SET is_active = false, created_at = now()
  WHERE user_id = target_user_id AND role = target_role;

  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    removed_by_user_id, 
    'role_removed',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'removed_role', target_role,
      'action_type', 'remove'
    ),
    now()
  );

  RETURN json_build_object('success', true, 'message', 'Role removed successfully');
END;
$$;

-- Create function to assign permission to user
CREATE OR REPLACE FUNCTION public.assign_user_permission(
  target_user_id UUID,
  permission_name TEXT,
  assigned_by_user_id UUID DEFAULT auth.uid(),
  assignment_reason TEXT DEFAULT 'Manual assignment'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permission_uuid UUID;
BEGIN
  -- Only super admins can assign permissions
  IF NOT is_super_admin(assigned_by_user_id) THEN
    RAISE EXCEPTION 'Only super admins can assign permissions';
  END IF;

  -- Get permission ID
  SELECT id INTO permission_uuid 
  FROM public.permissions 
  WHERE name = permission_name;

  IF permission_uuid IS NULL THEN
    RAISE EXCEPTION 'Permission not found: %', permission_name;
  END IF;

  -- Insert or update user permission
  INSERT INTO public.user_permissions (
    user_id, permission_id, granted_by, granted_at, is_active, reason
  ) VALUES (
    target_user_id, permission_uuid, assigned_by_user_id, now(), true, assignment_reason
  )
  ON CONFLICT (user_id, permission_id) 
  DO UPDATE SET 
    is_active = true, 
    granted_at = now(), 
    granted_by = assigned_by_user_id,
    reason = assignment_reason;

  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    assigned_by_user_id, 
    'permission_assigned',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'assigned_permission', permission_name,
      'action_type', 'assign'
    ),
    now()
  );

  RETURN json_build_object('success', true, 'message', 'Permission assigned successfully');
END;
$$;

-- Create function to remove permission from user
CREATE OR REPLACE FUNCTION public.remove_user_permission(
  target_user_id UUID,
  permission_name TEXT,
  removed_by_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permission_uuid UUID;
BEGIN
  -- Only super admins can remove permissions
  IF NOT is_super_admin(removed_by_user_id) THEN
    RAISE EXCEPTION 'Only super admins can remove permissions';
  END IF;

  -- Get permission ID
  SELECT id INTO permission_uuid 
  FROM public.permissions 
  WHERE name = permission_name;

  IF permission_uuid IS NULL THEN
    RAISE EXCEPTION 'Permission not found: %', permission_name;
  END IF;

  -- Update user permission to inactive
  UPDATE public.user_permissions 
  SET is_active = false, revoked_at = now()
  WHERE user_id = target_user_id AND permission_id = permission_uuid;

  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    removed_by_user_id, 
    'permission_removed',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'removed_permission', permission_name,
      'action_type', 'remove'
    ),
    now()
  );

  RETURN json_build_object('success', true, 'message', 'Permission removed successfully');
END;
$$;

-- Create function to get user's complete roles and permissions
CREATE OR REPLACE FUNCTION public.get_user_roles_and_permissions(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'roles', (
      SELECT json_agg(
        json_build_object(
          'role', ur.role::text,
          'is_active', ur.is_active,
          'created_at', ur.created_at
        )
      )
      FROM public.user_roles ur
      WHERE ur.user_id = target_user_id
    ),
    'permissions', (
      SELECT json_agg(
        json_build_object(
          'permission_name', p.name,
          'permission_description', p.description,
          'source', CASE 
            WHEN up.id IS NOT NULL THEN 'direct'
            ELSE 'role: ' || ur.role::text
          END,
          'is_active', COALESCE(up.is_active, true)
        )
      )
      FROM public.permissions p
      LEFT JOIN public.user_permissions up ON p.id = up.permission_id AND up.user_id = target_user_id
      LEFT JOIN public.role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN public.user_roles ur ON rp.role = ur.role AND ur.user_id = target_user_id AND ur.is_active = true
      WHERE (up.id IS NOT NULL AND up.is_active = true) OR (ur.id IS NOT NULL)
    ),
    'available_roles', (
      SELECT json_agg(role_name)
      FROM unnest(enum_range(NULL::user_role)) AS role_name
    ),
    'available_permissions', (
      SELECT json_agg(
        json_build_object(
          'name', name,
          'description', description,
          'category', category
        )
      )
      FROM public.permissions
      ORDER BY category, name
    )
  ) INTO result;

  RETURN result;
END;
$$;