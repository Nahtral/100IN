-- Clean up employee table policies and secure remaining system tables
-- Remove potentially problematic coach access to employee data

-- Drop overlapping and potentially insecure employee policies
DROP POLICY IF EXISTS "Coaches can view basic employee info" ON public.employees;
DROP POLICY IF EXISTS "Super admins and staff can manage all employees" ON public.employees;

-- Keep the secure policies we already have:
-- - "Employees can view their own data" 
-- - "Super admins and HR staff can view all employee data"
-- - "Super admins and HR can manage employees"

-- Secure the remaining system configuration tables
-- These tables were showing as warnings in the security scan

-- Secure role_permissions table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public') THEN
    -- Check if RLS is enabled, if not enable it
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = 'role_permissions' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
      EXECUTE 'ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY';
    END IF;
    
    -- Drop any existing policies first
    EXECUTE 'DROP POLICY IF EXISTS "Super admins only can manage role permissions" ON public.role_permissions';
    
    -- Create secure policy
    EXECUTE 'CREATE POLICY "Super admins only can manage role permissions" 
             ON public.role_permissions 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;

-- Secure role_templates table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_templates' AND table_schema = 'public') THEN
    -- Check if RLS is enabled, if not enable it
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = 'role_templates' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
      EXECUTE 'ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY';
    END IF;
    
    -- Drop any existing policies first
    EXECUTE 'DROP POLICY IF EXISTS "Super admins only can manage role templates" ON public.role_templates';
    
    -- Create secure policy
    EXECUTE 'CREATE POLICY "Super admins only can manage role templates" 
             ON public.role_templates 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;

-- Secure template_permissions table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'template_permissions' AND table_schema = 'public') THEN
    -- Check if RLS is enabled, if not enable it
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = 'template_permissions' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
      EXECUTE 'ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY';
    END IF;
    
    -- Drop any existing policies first
    EXECUTE 'DROP POLICY IF EXISTS "Super admins only can manage template permissions" ON public.template_permissions';
    
    -- Create secure policy
    EXECUTE 'CREATE POLICY "Super admins only can manage template permissions" 
             ON public.template_permissions 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;

-- Add audit logging for sensitive employee data access
CREATE OR REPLACE FUNCTION public.log_employee_data_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log access to employee data when accessed by someone other than the employee
  IF auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    )
    VALUES (
      auth.uid(),
      'employee_data_access',
      jsonb_build_object(
        'accessed_employee_id', COALESCE(NEW.id, OLD.id),
        'operation', TG_OP,
        'accessed_employee_email', COALESCE(NEW.email, OLD.email),
        'contains_salary_data', (COALESCE(NEW.salary, OLD.salary) IS NOT NULL OR COALESCE(NEW.hourly_rate, OLD.hourly_rate) IS NOT NULL),
        'justification', 'hr_administrative_access'
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to employees table
DROP TRIGGER IF EXISTS audit_employee_data_access ON public.employees;
CREATE TRIGGER audit_employee_data_access
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.log_employee_data_access();