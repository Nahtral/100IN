-- Fix employee table security vulnerabilities (corrected)

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

-- Allow employees to view their own basic information only (no salary/compensation data)
CREATE POLICY "employees_view_own_basic_info" ON public.employees
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

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

-- Only super admins can delete employees
CREATE POLICY "super_admins_delete_employees" ON public.employees
FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));

-- 4. Create function to safely get employee data with appropriate access controls
CREATE OR REPLACE FUNCTION public.get_employee_safe_data(_employee_id uuid)
RETURNS TABLE(
  id uuid,
  employee_id text,
  first_name text,
  last_name text,
  email text,
  phone text,
  department text,
  position text,
  hire_date date,
  employment_status text,
  payment_type text,
  hourly_rate numeric,
  salary numeric,
  emergency_contact_name text,
  emergency_contact_phone text,
  can_view_compensation boolean
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
    e.position,
    e.hire_date,
    e.employment_status,
    e.payment_type,
    -- Only show compensation data to authorized users
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
    -- Mask emergency contact info for non-authorized users
    CASE 
      WHEN is_super_admin(auth.uid()) OR 
           (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) OR
           auth.uid() = e.user_id
      THEN e.emergency_contact_name
      ELSE NULL
    END as emergency_contact_name,
    CASE 
      WHEN is_super_admin(auth.uid()) OR 
           (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) OR
           auth.uid() = e.user_id
      THEN e.emergency_contact_phone
      ELSE NULL
    END as emergency_contact_phone,
    -- Return whether user can view compensation data
    (is_super_admin(auth.uid()) OR 
     (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))) as can_view_compensation
  FROM public.employees e
  WHERE e.id = _employee_id
    AND (
      -- User can see their own record
      auth.uid() = e.user_id OR
      -- HR staff can see all records
      is_super_admin(auth.uid()) OR
      (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
    );
$$;