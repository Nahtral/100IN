-- Fix employee table security - targeted approach

-- 1. Fix search_path for existing security definer functions
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

-- 2. Create secure data access function for employee information
CREATE OR REPLACE FUNCTION public.get_employee_data_secure(employee_uuid uuid)
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
  hourly_rate numeric,
  salary numeric,
  emergency_contact_name text,
  emergency_contact_phone text,
  is_authorized_viewer boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_hr_authorized boolean;
  is_own_record boolean;
BEGIN
  -- Check if user is authorized HR staff
  is_hr_authorized := (
    is_super_admin(auth.uid()) OR 
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
  );
  
  -- Check if this is the employee's own record
  SELECT (auth.uid() = e.user_id) INTO is_own_record
  FROM public.employees e 
  WHERE e.id = employee_uuid;
  
  -- Return data based on authorization level
  RETURN QUERY
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
    -- Mask salary data for unauthorized users
    CASE WHEN is_hr_authorized THEN e.hourly_rate ELSE NULL END,
    CASE WHEN is_hr_authorized THEN e.salary ELSE NULL END,
    -- Emergency contacts visible to HR and employee themselves
    CASE WHEN (is_hr_authorized OR is_own_record) THEN e.emergency_contact_name ELSE NULL END,
    CASE WHEN (is_hr_authorized OR is_own_record) THEN e.emergency_contact_phone ELSE NULL END,
    is_hr_authorized
  FROM public.employees e
  WHERE e.id = employee_uuid
    AND (is_hr_authorized OR is_own_record);
END;
$$;

-- 3. Add data access logging trigger for sensitive employee data
CREATE OR REPLACE FUNCTION public.log_employee_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log when sensitive employee data is accessed
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    -- Only log if accessing someone else's record or salary data
    IF auth.uid() != COALESCE(NEW.user_id, OLD.user_id) OR 
       COALESCE(NEW.salary, OLD.salary) IS NOT NULL OR
       COALESCE(NEW.hourly_rate, OLD.hourly_rate) IS NOT NULL THEN
      
      INSERT INTO public.analytics_events (
        user_id,
        event_type,
        event_data,
        created_at
      ) VALUES (
        auth.uid(),
        'sensitive_employee_access',
        jsonb_build_object(
          'accessed_employee_id', COALESCE(NEW.id, OLD.id),
          'operation', TG_OP,
          'contains_salary', (COALESCE(NEW.salary, OLD.salary) IS NOT NULL),
          'contains_hourly_rate', (COALESCE(NEW.hourly_rate, OLD.hourly_rate) IS NOT NULL),
          'timestamp', now()
        ),
        now()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Create trigger for employee data access logging (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'employee_sensitive_access_log' 
    AND tgrelid = 'public.employees'::regclass
  ) THEN
    CREATE TRIGGER employee_sensitive_access_log
      AFTER SELECT OR UPDATE ON public.employees
      FOR EACH ROW
      EXECUTE FUNCTION public.log_employee_sensitive_access();
  END IF;
END $$;