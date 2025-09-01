CREATE OR REPLACE FUNCTION public.get_user_roles_and_permissions(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      SELECT json_agg(DISTINCT
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
$function$