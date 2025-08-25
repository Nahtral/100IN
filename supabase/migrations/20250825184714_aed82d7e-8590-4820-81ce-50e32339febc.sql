-- Fix employee table security vulnerabilities (final fix)

-- 1. Fix the search_path issue for security definer functions
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

-- 3. Create granular security policies

-- Allow employees to view their own basic information only
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

-- 4. Add compensation data protection function
CREATE OR REPLACE FUNCTION public.mask_employee_compensation(
  _salary numeric,
  _hourly_rate numeric,
  _employee_user_id uuid
)
RETURNS record
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result record;
BEGIN
  -- Check if user can view compensation data
  IF is_super_admin(auth.uid()) OR 
     (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) THEN
    -- Return actual values for authorized users
    SELECT _salary as salary, _hourly_rate as hourly_rate INTO result;
  ELSE
    -- Return null for unauthorized users
    SELECT null::numeric as salary, null::numeric as hourly_rate INTO result;
  END IF;
  
  RETURN result;
END;
$$;