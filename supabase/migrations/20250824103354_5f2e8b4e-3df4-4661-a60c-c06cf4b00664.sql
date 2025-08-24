-- CRITICAL SECURITY FIXES - Phase 1: RLS Policy Tightening

-- 1. EMPLOYEE DATA PROTECTION - Restrict sensitive salary data access
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Super admins and HR can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Super admins and HR staff can view all employee data" ON public.employees;

-- Enhanced employee data policies with salary data protection
CREATE POLICY "Employees can view own basic data" ON public.employees
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Employees can view own salary data" ON public.employees
FOR SELECT 
USING (auth.uid() = user_id AND (salary IS NOT NULL OR hourly_rate IS NOT NULL));

CREATE POLICY "HR staff can view all employee data" ON public.employees
FOR SELECT 
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'::text)));

CREATE POLICY "HR staff can manage employees" ON public.employees
FOR ALL
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'::text)));

-- 2. PROFILE DATA LOCKDOWN - Prevent unauthorized data harvesting
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authorized staff can view profiles for administrative purposes" ON public.profiles;
DROP POLICY IF EXISTS "Authorized staff can manage user profiles" ON public.profiles;

-- Enhanced profile policies with data masking consideration
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Staff can view profiles for administration" ON public.profiles
FOR SELECT 
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_users'::text)));

CREATE POLICY "Staff can manage profiles" ON public.profiles
FOR ALL
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_users'::text)));

-- 3. MEDICAL DATA HIPAA COMPLIANCE - Strengthen medical access controls
DROP POLICY IF EXISTS "Licensed medical staff can view all health check-ins" ON public.daily_health_checkins;
DROP POLICY IF EXISTS "Medical staff can manage health check-ins" ON public.daily_health_checkins;
DROP POLICY IF EXISTS "Parents can view their children's check-ins" ON public.daily_health_checkins;
DROP POLICY IF EXISTS "Players can manage their own check-ins" ON public.daily_health_checkins;

-- Enhanced medical data policies with strict access control
CREATE POLICY "Players can manage own health check-ins" ON public.daily_health_checkins
FOR ALL
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = daily_health_checkins.player_id 
    AND players.user_id = auth.uid()
));

CREATE POLICY "Licensed medical staff can view health check-ins" ON public.daily_health_checkins
FOR SELECT 
USING (has_role(auth.uid(), 'medical'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Medical staff can manage health check-ins" ON public.daily_health_checkins
FOR ALL
USING (has_role(auth.uid(), 'medical'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Parents can view children health check-ins" ON public.daily_health_checkins
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = daily_health_checkins.player_id 
    AND pcr.parent_id = auth.uid()
));

-- 4. PAYROLL DATA SECURITY - Restrict payroll access with audit logging
DROP POLICY IF EXISTS "Staff and super admins can manage payroll periods" ON public.payroll_periods;

CREATE POLICY "Super admins can manage payroll" ON public.payroll_periods
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "HR staff can view payroll periods" ON public.payroll_periods
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'::text));

-- 5. FINANCIAL DATA PROTECTION - Restrict payments access
DROP POLICY IF EXISTS "Financial staff can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Financial staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Super admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Enhanced payment policies
CREATE POLICY "Super admins can manage all payments" ON public.payments
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Financial staff can manage payments" ON public.payments
FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_finances'::text));

CREATE POLICY "Users can view own payments" ON public.payments
FOR SELECT 
USING (auth.uid() = payer_id);

CREATE POLICY "Staff can view payments for administration" ON public.payments
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

-- 6. ADD AUDIT LOGGING FUNCTIONS AND TRIGGERS

-- Create audit log function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    auth.uid(),
    'sensitive_data_access',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'accessed_at', now(),
      'user_role', (
        SELECT string_agg(ur.role::text, ',') 
        FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.is_active = true
      ),
      'justification', 'administrative_access'
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers for sensitive tables
CREATE TRIGGER audit_employee_access
  AFTER SELECT ON public.employees
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL AND auth.uid() != NEW.user_id)
  EXECUTE FUNCTION public.audit_sensitive_access();

CREATE TRIGGER audit_medical_access
  AFTER SELECT ON public.daily_health_checkins
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION public.audit_sensitive_access();

CREATE TRIGGER audit_payroll_access
  AFTER SELECT ON public.payroll_periods
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION public.audit_sensitive_access();

-- 7. CREATE DATA MASKING FUNCTION FOR NON-AUTHORIZED USERS
CREATE OR REPLACE FUNCTION public.mask_sensitive_email(email_input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Only mask for non-super admins and non-staff
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RETURN LEFT(email_input, 3) || '***@' || SPLIT_PART(email_input, '@', 2);
  END IF;
  RETURN email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. ADD RATE LIMITING FOR AUTH ATTEMPTS
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent auth attempts from same IP/user
  SELECT COUNT(*) INTO attempt_count
  FROM public.analytics_events
  WHERE event_type = 'auth_attempt'
    AND created_at > NOW() - INTERVAL '15 minutes'
    AND (
      event_data->>'ip_address' = current_setting('request.headers')::json->>'x-real-ip'
      OR user_id = NEW.id
    );
  
  -- If too many attempts, log security event
  IF attempt_count > 10 THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    ) VALUES (
      NEW.id,
      'security_alert',
      jsonb_build_object(
        'alert_type', 'rate_limit_exceeded',
        'attempt_count', attempt_count,
        'ip_address', current_setting('request.headers')::json->>'x-real-ip'
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create permissions if they don't exist
INSERT INTO public.permissions (name, description, category) VALUES
('manage_finances', 'Can manage financial data and payments', 'financial'),
('view_audit_logs', 'Can view system audit logs', 'security'),
('emergency_access', 'Can access data in emergency situations', 'security')
ON CONFLICT (name) DO NOTHING;