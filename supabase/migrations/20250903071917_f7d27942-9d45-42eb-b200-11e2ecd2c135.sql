-- Create employees view for scheduling
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

-- Create RPC function for employee search with pagination
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ev.employee_id,
    ev.full_name,
    ev.email,
    ev.role,
    ev.role_display,
    ev.phone
  FROM public.employees_v ev
  WHERE (q = '' OR ev.full_name ILIKE '%' || q || '%' OR ev.email ILIKE '%' || q || '%')
  ORDER BY ev.full_name
  LIMIT lim
  OFFSET off;
$$;

-- Grant permissions
GRANT SELECT ON public.employees_v TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_employees TO authenticated;