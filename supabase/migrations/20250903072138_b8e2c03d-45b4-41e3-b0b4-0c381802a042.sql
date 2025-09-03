-- Create the employees view for scheduling (views don't support RLS policies directly)
CREATE OR REPLACE VIEW public.employees_v AS
SELECT 
  p.id as employee_id,
  p.full_name,
  p.email,
  ur.role::text as role,
  p.phone,
  CASE 
    WHEN ur.role = 'super_admin' THEN 'Super Admin'
    WHEN ur.role = 'coach' THEN 'Coach'
    WHEN ur.role = 'staff' THEN 'Staff'
    ELSE 'Employee'
  END as role_display,
  p.approval_status,
  ur.is_active as role_active,
  p.created_at
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role IN ('super_admin', 'coach', 'staff')
  AND ur.is_active = true
  AND p.approval_status = 'approved';

-- Create the RPC function for employee search with proper security
CREATE OR REPLACE FUNCTION public.rpc_get_employees(
  q text DEFAULT '',
  lim integer DEFAULT 50,
  off integer DEFAULT 0
)
RETURNS TABLE(
  employee_id uuid,
  full_name text,
  email text,
  role text,
  role_display text,
  phone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only allow super admins, staff, and coaches to fetch employee data
  IF NOT (
    public.is_super_admin(auth.uid()) OR 
    public.has_role(auth.uid(), 'staff'::public.user_role) OR 
    public.has_role(auth.uid(), 'coach'::public.user_role)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    ur.role::text,
    CASE 
      WHEN ur.role = 'super_admin' THEN 'Super Admin'
      WHEN ur.role = 'coach' THEN 'Coach'
      WHEN ur.role = 'staff' THEN 'Staff'
      ELSE 'Employee'
    END,
    p.phone
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('super_admin', 'coach', 'staff')
    AND ur.is_active = true
    AND p.approval_status = 'approved'
    AND (q = '' OR p.full_name ILIKE '%' || q || '%' OR p.email ILIKE '%' || q || '%')
  ORDER BY p.full_name
  LIMIT lim
  OFFSET off;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.employees_v TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_employees TO authenticated;