-- Fix remaining security definer functions with missing search_path
-- These are the remaining functions that need the security fix

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

CREATE OR REPLACE FUNCTION public.get_employees_secure()
RETURNS TABLE(
  id uuid, 
  employee_id text, 
  first_name text, 
  last_name text, 
  email text, 
  phone text, 
  department text, 
  "position" text, 
  hire_date date, 
  employment_status text, 
  payment_type text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  has_compensation_access boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    e.id,
    e.employee_id,
    e.first_name,
    e.last_name,
    e.email,
    e.phone,
    e.department,
    e."position",
    e.hire_date,
    e.employment_status,
    e.payment_type,
    e.created_at,
    e.updated_at,
    -- Flag indicating if current user can access compensation data
    (is_super_admin(auth.uid()) OR 
     (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))) as has_compensation_access
  FROM public.employees e
  WHERE (
    -- HR staff can see all employees
    is_super_admin(auth.uid()) OR
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) OR
    -- Employees can only see their own basic data
    auth.uid() = e.user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_employee_compensation_secure(employee_uuid uuid)
RETURNS TABLE(employee_id uuid, hourly_rate numeric, salary numeric, emergency_contact_name text, emergency_contact_phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    e.id,
    e.hourly_rate,
    e.salary,
    e.emergency_contact_name,
    e.emergency_contact_phone
  FROM public.employees e
  WHERE e.id = employee_uuid
    AND (
      -- Only super admins and authorized HR staff can access compensation
      is_super_admin(auth.uid()) OR
      (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
    );
$$;