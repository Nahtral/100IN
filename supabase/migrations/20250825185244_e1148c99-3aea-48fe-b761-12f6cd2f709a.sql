-- Fix remaining search_path security issues for all functions

CREATE OR REPLACE FUNCTION public.get_safe_profile_info(profile_id uuid)
RETURNS TABLE(id uuid, display_name text, access_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is authorized to see full contact info
  IF is_super_admin(auth.uid()) OR 
     user_has_permission(auth.uid(), 'manage_users') OR
     auth.uid() = profile_id THEN
    -- Return full access if authorized
    RETURN QUERY
    SELECT p.id, p.full_name, 'full_access'::TEXT
    FROM public.profiles p
    WHERE p.id = profile_id;
  ELSE
    -- Return masked info for general access (prevent contact harvesting)
    RETURN QUERY
    SELECT p.id, 
           CASE 
             WHEN LENGTH(p.full_name) > 0 THEN LEFT(p.full_name, 1) || '***'
             ELSE 'User'
           END,
           'limited_access'::TEXT
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_name text, permission_description text, source text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Get permissions from role
  SELECT p.name, p.description, 'role: ' || ur.role::text
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = _user_id AND ur.is_active = TRUE
  
  UNION
  
  -- Get additional permissions
  SELECT p.name, p.description, 'additional'
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = _user_id AND up.is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.mask_sensitive_email(email_input text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only mask for non-super admins and non-staff
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RETURN LEFT(email_input, 3) || '***@' || SPLIT_PART(email_input, '@', 2);
  END IF;
  RETURN email_input;
END;
$$;