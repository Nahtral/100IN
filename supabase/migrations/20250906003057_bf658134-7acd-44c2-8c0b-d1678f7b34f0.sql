-- Fix the secure function with proper SQL syntax
DROP FUNCTION IF EXISTS public.get_employees_secure();

CREATE OR REPLACE FUNCTION public.get_employees_secure()
RETURNS TABLE(
  id uuid,
  employee_id uuid,
  first_name text,
  last_name text,
  full_name text,
  email text,
  phone text,
  department text,
  "position" text,
  hire_date date,
  employment_status text,
  payment_type text,
  role text,
  role_active boolean,
  role_display text,
  approval_status text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    p.id as employee_id,
    e.first_name,
    e.last_name,
    p.full_name,
    CASE 
      WHEN is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role) THEN p.email
      ELSE mask_sensitive_email(p.email)
    END as email,
    p.phone,
    e.department,
    e."position",
    e.hire_date,
    e.employment_status,
    e.payment_type,
    ur.role::text,
    ur.is_active as role_active,
    CASE 
      WHEN ur.role = 'super_admin' THEN 'Super Admin'
      WHEN ur.role = 'coach' THEN 'Coach'
      WHEN ur.role = 'staff' THEN 'Staff'
      ELSE 'Employee'
    END as role_display,
    p.approval_status,
    p.created_at
  FROM public.employees e
  INNER JOIN public.profiles p ON e.user_id = p.id
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('super_admin', 'coach', 'staff')
    AND ur.is_active = true
    AND (
      -- Only super admins, staff, and coaches can access employee data
      is_super_admin(auth.uid()) OR 
      has_role(auth.uid(), 'staff'::user_role) OR 
      has_role(auth.uid(), 'coach'::user_role) OR
      -- Employees can see their own data
      auth.uid() = p.id
    );
$$;