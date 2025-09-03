-- Ensure reliable role checking with a comprehensive view and functions

-- Create a reliable current user view with all needed data
CREATE OR REPLACE VIEW public.current_user_v AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.approval_status,
  COALESCE(ur.role::text, 'player') as primary_role,
  ur.is_active as role_active,
  CASE WHEN ur.role = 'super_admin' AND ur.is_active = true THEN true ELSE false END as is_super_admin,
  array_agg(DISTINCT ur2.role::text) FILTER (WHERE ur2.is_active = true) as all_roles,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.is_active = true
LEFT JOIN public.user_roles ur2 ON p.id = ur2.user_id AND ur2.is_active = true
WHERE p.id = auth.uid()
GROUP BY p.id, p.email, p.full_name, p.approval_status, ur.role, ur.is_active, p.created_at, p.updated_at;

-- Enable RLS on the view
ALTER VIEW public.current_user_v SET (security_invoker = on);

-- Create a secure function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(check_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role::text = check_role 
      AND ur.is_active = true
  );
$$;

-- Function to get current user's primary role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ur.role::text, 'player')
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() 
    AND ur.is_active = true
  ORDER BY 
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
  LIMIT 1;
$$;

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT current_user_has_role('super_admin');
$$;