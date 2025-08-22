-- Fix critical security vulnerabilities for existing tables with correct schema
-- Enable RLS on tables that are currently publicly accessible

-- 1. Fix performance_logs table - restrict to super admins only
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Update existing policies for performance_logs to be more restrictive
DROP POLICY IF EXISTS "System admins can view performance logs" ON public.performance_logs;
CREATE POLICY "System admins can view performance logs" ON public.performance_logs
FOR SELECT USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System admins can manage performance logs" ON public.performance_logs;
CREATE POLICY "System admins can manage performance logs" ON public.performance_logs
FOR ALL USING (public.is_super_admin(auth.uid()));

-- 2. Fix error_logs table - restrict to super admins only  
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Update existing policies for error_logs to be more restrictive
DROP POLICY IF EXISTS "System admins can view error logs" ON public.error_logs;
CREATE POLICY "System admins can view error logs" ON public.error_logs
FOR SELECT USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System admins can manage error logs" ON public.error_logs;
CREATE POLICY "System admins can manage error logs" ON public.error_logs
FOR ALL USING (public.is_super_admin(auth.uid()));

-- 3. Fix payments table - add more restrictive policies
-- Already has RLS enabled, just update policies
DROP POLICY IF EXISTS "Financial staff can view payments" ON public.payments;
CREATE POLICY "Financial staff can view payments" ON public.payments
FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'partner') OR
  public.has_role(auth.uid(), 'staff') OR
  auth.uid() = payer_id
);

DROP POLICY IF EXISTS "Financial staff can manage payments" ON public.payments;
CREATE POLICY "Financial staff can manage payments" ON public.payments
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- 4. Fix partner_team_sponsorships - add more restrictive policies
-- Already has RLS enabled, just update policies
DROP POLICY IF EXISTS "Partners can view sponsorships enhanced" ON public.partner_team_sponsorships;
CREATE POLICY "Partners can view sponsorships enhanced" ON public.partner_team_sponsorships
FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'partner') OR
  public.has_role(auth.uid(), 'staff')
);

DROP POLICY IF EXISTS "Partners can manage sponsorships enhanced" ON public.partner_team_sponsorships;
CREATE POLICY "Partners can manage sponsorships enhanced" ON public.partner_team_sponsorships
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- 5. Fix medical_agreements - add more restrictive policies
-- Already has RLS enabled, just update policies
DROP POLICY IF EXISTS "Medical staff can view agreements enhanced" ON public.medical_agreements;
CREATE POLICY "Medical staff can view agreements enhanced" ON public.medical_agreements
FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical') OR
  public.has_role(auth.uid(), 'staff')
);

DROP POLICY IF EXISTS "Medical staff can manage agreements enhanced" ON public.medical_agreements;
CREATE POLICY "Medical staff can manage agreements enhanced" ON public.medical_agreements
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

-- 6. Enhanced audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive data access to analytics_events table
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
      'timestamp', now(),
      'user_role', (
        SELECT string_agg(ur.role::text, ',') 
        FROM user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.is_active = true
      )
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables that exist
DROP TRIGGER IF EXISTS payments_audit_trigger ON public.payments;
CREATE TRIGGER payments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();

DROP TRIGGER IF EXISTS medical_agreements_audit_trigger ON public.medical_agreements;
CREATE TRIGGER medical_agreements_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_agreements
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();

DROP TRIGGER IF EXISTS partner_sponsorships_audit_trigger ON public.partner_team_sponsorships;
CREATE TRIGGER partner_sponsorships_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_team_sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();

-- Add rate limiting function for authentication attempts
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log authentication attempts for monitoring
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    NEW.id,
    'auth_attempt',
    jsonb_build_object(
      'email', NEW.email,
      'timestamp', now(),
      'ip_address', current_setting('request.headers')::json->>'x-real-ip'
    ),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;