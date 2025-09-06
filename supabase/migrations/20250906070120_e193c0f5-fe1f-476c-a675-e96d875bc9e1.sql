-- Create optimized function to get all user auth data in ONE query
CREATE OR REPLACE FUNCTION public.get_user_auth_data_secure(target_user_id uuid DEFAULT auth.uid())
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  user_profile RECORD;
  user_roles_array text[];
  is_admin boolean := false;
BEGIN
  -- Single query to get profile data
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.approval_status,
    p.rejection_reason,
    p.latest_tryout_total,
    p.latest_tryout_placement,
    p.latest_tryout_date
  INTO user_profile
  FROM public.profiles p
  WHERE p.id = target_user_id;

  -- If no profile found, return basic structure
  IF NOT FOUND THEN
    RETURN json_build_object(
      'profile', null,
      'roles', '[]'::json,
      'primaryRole', null,
      'isSuperAdmin', false,
      'isApproved', false,
      'error', 'Profile not found'
    );
  END IF;

  -- Get all active roles for the user
  SELECT array_agg(ur.role::text ORDER BY 
    CASE ur.role
      WHEN 'super_admin' THEN 1
      WHEN 'staff' THEN 2
      WHEN 'coach' THEN 3
      WHEN 'medical' THEN 4
      WHEN 'partner' THEN 5
      WHEN 'parent' THEN 6
      WHEN 'player' THEN 7
      ELSE 8
    END
  ) INTO user_roles_array
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id AND ur.is_active = true;

  -- Check if user is super admin
  is_admin := EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = target_user_id 
      AND ur.role = 'super_admin' 
      AND ur.is_active = true
  );

  -- Build the result
  result := json_build_object(
    'profile', row_to_json(user_profile),
    'roles', COALESCE(array_to_json(user_roles_array), '[]'::json),
    'primaryRole', COALESCE(user_roles_array[1], 'player'),
    'isSuperAdmin', is_admin,
    'isApproved', (user_profile.approval_status = 'approved' OR is_admin),
    'error', null
  );

  RETURN result;
END;
$function$;