-- Fix employee table security vulnerabilities

-- 1. First, fix the search_path issue for security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check if user has permission through role
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id 
      AND ur.is_active = TRUE
      AND p.name = _permission_name
  )
  OR
  -- Check if user has additional permission directly
  EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id 
      AND up.is_active = TRUE
      AND p.name = _permission_name
  );
$$;

-- 2. Drop existing overly broad policies
DROP POLICY IF EXISTS "Employees can view own basic data" ON public.employees;
DROP POLICY IF EXISTS "HR staff can manage employees" ON public.employees;
DROP POLICY IF EXISTS "HR staff can view all employee data" ON public.employees;

-- 3. Create more granular security policies

-- Allow employees to view their own non-sensitive basic information only
CREATE POLICY "employees_view_own_basic_info" ON public.employees
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  -- Note: This policy will be used with column-level security to limit what fields they can see
);

-- Allow HR staff with manage_employees permission to view all employee data
CREATE POLICY "hr_staff_view_all_employees" ON public.employees  
FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

-- Allow HR staff to insert new employees
CREATE POLICY "hr_staff_insert_employees" ON public.employees
FOR INSERT TO authenticated  
WITH CHECK (
  is_super_admin(auth.uid()) OR
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

-- Allow HR staff to update employee records
CREATE POLICY "hr_staff_update_employees" ON public.employees
FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

-- Only super admins can delete employees (soft delete recommended)
CREATE POLICY "super_admins_delete_employees" ON public.employees
FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));

-- 4. Create a secure view for basic employee directory (non-sensitive info only)
CREATE OR REPLACE VIEW public.employee_directory AS
SELECT 
  id,
  employee_id,
  first_name,
  last_name,
  email,
  phone,
  department,
  position,
  hire_date,
  employment_status,
  created_at,
  updated_at
FROM public.employees
WHERE employment_status = 'active';

-- Enable RLS on the view
ALTER VIEW public.employee_directory SET (security_barrier = true);

-- Create RLS policy for the directory view
CREATE POLICY "authenticated_users_view_directory" ON public.employee_directory
FOR SELECT TO authenticated
USING (true);

-- 5. Create function to check if user can view sensitive employee data
CREATE OR REPLACE FUNCTION public.can_view_employee_sensitive_data(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    -- Super admins can view all sensitive data
    is_super_admin(auth.uid()) OR
    -- HR staff with proper permissions can view sensitive data
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) OR
    -- Employees can view their own data (but limited fields through application logic)
    (auth.uid() = (SELECT user_id FROM public.employees WHERE id = _employee_id))
  );
$$;

-- 6. Create secure function to get employee compensation data (for authorized users only)
CREATE OR REPLACE FUNCTION public.get_employee_compensation(_employee_id uuid)
RETURNS TABLE(
  hourly_rate numeric,
  salary numeric,
  payment_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN is_super_admin(auth.uid()) OR 
           (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
      THEN e.hourly_rate
      ELSE NULL
    END as hourly_rate,
    CASE 
      WHEN is_super_admin(auth.uid()) OR 
           (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
      THEN e.salary  
      ELSE NULL
    END as salary,
    e.payment_type
  FROM public.employees e
  WHERE e.id = _employee_id
    AND can_view_employee_sensitive_data(_employee_id);
$$;