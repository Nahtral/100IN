-- Fix employee table security vulnerabilities - simplified approach

-- 1. Fix search_path security issue for existing functions
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

-- 2. Create secure function to get employee list with masked sensitive data
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
  created_at timestamptz,
  updated_at timestamptz,
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

-- 3. Create secure function to get compensation data (authorized users only)
CREATE OR REPLACE FUNCTION public.get_employee_compensation_secure(employee_uuid uuid)
RETURNS TABLE(
  employee_id uuid,
  hourly_rate numeric,
  salary numeric,
  emergency_contact_name text,
  emergency_contact_phone text
)
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

-- 4. Create audit logging function for employee data access
CREATE OR REPLACE FUNCTION public.log_employee_access(
  accessed_employee_id uuid,
  access_type text,
  includes_sensitive_data boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    auth.uid(),
    'employee_data_access',
    jsonb_build_object(
      'accessed_employee_id', accessed_employee_id,
      'access_type', access_type,
      'includes_sensitive_data', includes_sensitive_data,
      'timestamp', now(),
      'user_role', (
        SELECT string_agg(role::text, ',') 
        FROM public.user_roles 
        WHERE user_id = auth.uid() AND is_active = true
      )
    ),
    now()
  );
$$;