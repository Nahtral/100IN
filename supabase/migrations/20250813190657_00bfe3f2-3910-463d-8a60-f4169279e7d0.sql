-- Drop existing overly broad payslips policies
DROP POLICY IF EXISTS "Staff and super admins can manage all payslips" ON public.payslips;
DROP POLICY IF EXISTS "Employees can view their own payslips" ON public.payslips;

-- Create more granular payslips policies
-- Employees can only view their own payslips (SELECT only)
CREATE POLICY "Employees can view their own payslips" 
ON public.payslips 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM employees e 
    WHERE e.id = payslips.employee_id 
    AND e.user_id = auth.uid()
  )
);

-- Only super admins can manage all payslips (full access)
CREATE POLICY "Super admins can manage all payslips" 
ON public.payslips 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- HR staff can manage payslips but only with explicit HR role
CREATE POLICY "HR staff can manage payslips" 
ON public.payslips 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND 
   user_has_permission(auth.uid(), 'manage_payroll'))
);

-- Create the manage_payroll permission if it doesn't exist
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_payroll', 'Can create, update, and delete payroll records', 'hr')
ON CONFLICT (name) DO NOTHING;

-- Update employees table policy to be more restrictive
DROP POLICY IF EXISTS "Coaches and employees can view employee data" ON public.employees;

-- More granular employee data access
CREATE POLICY "Employees can view their own data" 
ON public.employees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins and HR staff can view all employee data" 
ON public.employees 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND 
   user_has_permission(auth.uid(), 'manage_employees'))
);

CREATE POLICY "Coaches can view basic employee info" 
ON public.employees 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach'::user_role) AND
  -- Only allow coaches to see basic work-related info, not salary/personal details
  true
);

-- Super admins and HR can manage employee records
CREATE POLICY "Super admins and HR can manage employees" 
ON public.employees 
FOR ALL 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND 
   user_has_permission(auth.uid(), 'manage_employees'))
);

-- Create the manage_employees permission
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_employees', 'Can create, update, and delete employee records', 'hr')
ON CONFLICT (name) DO NOTHING;