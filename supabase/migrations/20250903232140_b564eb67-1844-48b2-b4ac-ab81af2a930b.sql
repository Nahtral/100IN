-- Create a simple view for current user role lookup
CREATE OR REPLACE VIEW public.current_user_v AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.approval_status,
  COALESCE(ur.role::text, 'player') as role,
  COALESCE(ur.is_active, false) as is_active,
  p.approval_status = 'approved' as is_approved,
  ur.role = 'super_admin' as is_super_admin
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.is_active = true
WHERE p.id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.current_user_v TO authenticated;

-- Create reliable function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.current_user_v LIMIT 1),
    false
  );
$$;