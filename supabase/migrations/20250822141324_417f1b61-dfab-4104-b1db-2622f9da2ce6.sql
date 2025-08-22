-- Fix critical security vulnerabilities identified in security audit
-- All tables with sensitive data must have proper RLS policies

-- 1. Fix employees table - restrict to HR staff and employee themselves
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
CREATE POLICY "Employees can view own record" ON public.employees
FOR SELECT USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'staff')
);

DROP POLICY IF EXISTS "HR staff can manage employees" ON public.employees;
CREATE POLICY "HR staff can manage employees" ON public.employees
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- 2. Fix payslips table - restrict to employee and payroll staff
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own payslips" ON public.payslips;
CREATE POLICY "Employees can view own payslips" ON public.payslips
FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'staff')
);

DROP POLICY IF EXISTS "Payroll staff can manage payslips" ON public.payslips;
CREATE POLICY "Payroll staff can manage payslips" ON public.payslips
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'staff')
);

-- 3. Fix medical tables - restrict to medical staff, patient, and guardians
ALTER TABLE public.daily_health_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injury_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_plans ENABLE ROW LEVEL SECURITY;

-- Daily health checkins
DROP POLICY IF EXISTS "Users can view own health checkins" ON public.daily_health_checkins;
CREATE POLICY "Users can view own health checkins" ON public.daily_health_checkins
FOR SELECT USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

DROP POLICY IF EXISTS "Medical staff can manage health checkins" ON public.daily_health_checkins;
CREATE POLICY "Medical staff can manage health checkins" ON public.daily_health_checkins
FOR ALL USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

-- Injury reports
DROP POLICY IF EXISTS "Users can view own injury reports" ON public.injury_reports;
CREATE POLICY "Users can view own injury reports" ON public.injury_reports
FOR SELECT USING (
  reported_by = auth.uid() OR
  player_id IN (SELECT id FROM players WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical') OR
  public.has_role(auth.uid(), 'coach')
);

DROP POLICY IF EXISTS "Medical staff can manage injury reports" ON public.injury_reports;
CREATE POLICY "Medical staff can manage injury reports" ON public.injury_reports
FOR ALL USING (
  reported_by = auth.uid() OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical') OR
  public.has_role(auth.uid(), 'coach')
);

-- Medical appointments
DROP POLICY IF EXISTS "Users can view own appointments" ON public.medical_appointments;
CREATE POLICY "Users can view own appointments" ON public.medical_appointments
FOR SELECT USING (
  patient_id IN (SELECT id FROM players WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

DROP POLICY IF EXISTS "Medical staff can manage appointments" ON public.medical_appointments;
CREATE POLICY "Medical staff can manage appointments" ON public.medical_appointments
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

-- Rehabilitation plans
DROP POLICY IF EXISTS "Users can view own rehab plans" ON public.rehabilitation_plans;
CREATE POLICY "Users can view own rehab plans" ON public.rehabilitation_plans
FOR SELECT USING (
  patient_id IN (SELECT id FROM players WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

DROP POLICY IF EXISTS "Medical staff can manage rehab plans" ON public.rehabilitation_plans;
CREATE POLICY "Medical staff can manage rehab plans" ON public.rehabilitation_plans
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

-- 4. Fix performance and error logs - restrict to system administrators
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view performance logs" ON public.performance_logs;
CREATE POLICY "System admins can view performance logs" ON public.performance_logs
FOR SELECT USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System admins can manage performance logs" ON public.performance_logs;
CREATE POLICY "System admins can manage performance logs" ON public.performance_logs
FOR ALL USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System admins can view error logs" ON public.error_logs;
CREATE POLICY "System admins can view error logs" ON public.error_logs
FOR SELECT USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "System admins can manage error logs" ON public.error_logs;
CREATE POLICY "System admins can manage error logs" ON public.error_logs
FOR ALL USING (public.is_super_admin(auth.uid()));

-- 5. Fix financial tables - restrict to authorized financial staff
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_team_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_agreements ENABLE ROW LEVEL SECURITY;

-- Payments
DROP POLICY IF EXISTS "Financial staff can view payments" ON public.payments;
CREATE POLICY "Financial staff can view payments" ON public.payments
FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'partner')
);

DROP POLICY IF EXISTS "Financial staff can manage payments" ON public.payments;
CREATE POLICY "Financial staff can manage payments" ON public.payments
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'partner')
);

-- Partner sponsorships
DROP POLICY IF EXISTS "Partners can view sponsorships" ON public.partner_team_sponsorships;
CREATE POLICY "Partners can view sponsorships" ON public.partner_team_sponsorships
FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid()) OR
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'partner')
);

DROP POLICY IF EXISTS "Partners can manage sponsorships" ON public.partner_team_sponsorships;
CREATE POLICY "Partners can manage sponsorships" ON public.partner_team_sponsorships
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'partner')
);

-- Medical agreements
DROP POLICY IF EXISTS "Medical staff can view agreements" ON public.medical_agreements;
CREATE POLICY "Medical staff can view agreements" ON public.medical_agreements
FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

DROP POLICY IF EXISTS "Medical staff can manage agreements" ON public.medical_agreements;
CREATE POLICY "Medical staff can manage agreements" ON public.medical_agreements
FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'medical')
);

-- Add audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
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
      'timestamp', now()
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS employees_audit_trigger ON public.employees;
CREATE TRIGGER employees_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();

DROP TRIGGER IF EXISTS payslips_audit_trigger ON public.payslips;
CREATE TRIGGER payslips_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();

DROP TRIGGER IF EXISTS medical_appointments_audit_trigger ON public.medical_appointments;
CREATE TRIGGER medical_appointments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();