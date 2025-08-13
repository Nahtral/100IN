-- HIPAA-Compliant Medical Data Security Updates
-- Remove broad coach and staff access to medical data

-- Update daily_health_checkins policies
DROP POLICY IF EXISTS "Coaches can view their team's check-ins" ON public.daily_health_checkins;
DROP POLICY IF EXISTS "Medical staff can view all check-ins" ON public.daily_health_checkins;

-- Create HIPAA-compliant policies for daily_health_checkins
CREATE POLICY "Licensed medical staff can view all health check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Medical staff can manage health check-ins" 
ON public.daily_health_checkins 
FOR ALL 
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  is_super_admin(auth.uid()) OR
  -- Allow patients to create their own check-ins
  (EXISTS (SELECT 1 FROM players WHERE players.id = daily_health_checkins.player_id AND players.user_id = auth.uid()))
);

-- Update injury_reports policies  
DROP POLICY IF EXISTS "Coaches can view their team's injury reports" ON public.injury_reports;
DROP POLICY IF EXISTS "Authorized users can create injury reports" ON public.injury_reports;

-- Create HIPAA-compliant policies for injury_reports
CREATE POLICY "Licensed medical staff can manage all injury reports" 
ON public.injury_reports 
FOR ALL 
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Patients can create their own injury reports" 
ON public.injury_reports 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE players.id = injury_reports.player_id AND players.user_id = auth.uid())
);

-- Update medical_appointments policies
DROP POLICY IF EXISTS "Coaches can view their team's medical appointments" ON public.medical_appointments;

-- Create HIPAA-compliant policies for medical_appointments
CREATE POLICY "Licensed medical staff can manage all medical appointments" 
ON public.medical_appointments 
FOR ALL 
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Update health_wellness policies
DROP POLICY IF EXISTS "Medical team can manage health data" ON public.health_wellness;

-- Create HIPAA-compliant policies for health_wellness
CREATE POLICY "Licensed medical staff can manage all health wellness data" 
ON public.health_wellness 
FOR ALL 
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Create medical permissions for granular control
INSERT INTO public.permissions (name, description, category)
VALUES ('view_medical_records', 'Can view patient medical records (HIPAA compliance)', 'medical')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, description, category)
VALUES ('manage_medical_records', 'Can create, update, and delete medical records', 'medical')
ON CONFLICT (name) DO NOTHING;

-- Add audit logging function for medical data access (HIPAA compliance)
CREATE OR REPLACE FUNCTION public.log_medical_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to medical data for compliance
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  )
  VALUES (
    auth.uid(),
    'medical_data_access',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'record_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'patient_id', COALESCE(NEW.player_id, OLD.player_id)
    ),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to medical tables (for data modification tracking)
CREATE TRIGGER audit_daily_health_checkins
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_health_checkins
  FOR EACH ROW EXECUTE FUNCTION public.log_medical_access();

CREATE TRIGGER audit_injury_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.injury_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_medical_access();

CREATE TRIGGER audit_medical_appointments  
  AFTER INSERT OR UPDATE OR DELETE ON public.medical_appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_medical_access();

CREATE TRIGGER audit_health_wellness
  AFTER INSERT OR UPDATE OR DELETE ON public.health_wellness
  FOR EACH ROW EXECUTE FUNCTION public.log_medical_access();