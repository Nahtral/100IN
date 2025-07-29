-- Update daily_health_checkins table to support comprehensive tracking
ALTER TABLE daily_health_checkins 
ADD COLUMN IF NOT EXISTS pain_level integer CHECK (pain_level >= 0 AND pain_level <= 10),
ADD COLUMN IF NOT EXISTS pain_location text,
ADD COLUMN IF NOT EXISTS overall_mood text,
ADD COLUMN IF NOT EXISTS training_readiness integer CHECK (training_readiness >= 1 AND training_readiness <= 10),
ADD COLUMN IF NOT EXISTS medication_taken text,
ADD COLUMN IF NOT EXISTS symptoms text[];

-- Create a new table for tracking rehabilitation plans
CREATE TABLE IF NOT EXISTS rehabilitation_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id uuid NOT NULL,
    injury_report_id uuid REFERENCES injury_reports(id),
    plan_title text NOT NULL,
    plan_description text,
    start_date date NOT NULL,
    target_completion_date date,
    actual_completion_date date,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    exercises jsonb DEFAULT '[]'::jsonb,
    progress_notes text,
    assigned_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create a table for medical appointments
CREATE TABLE IF NOT EXISTS medical_appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id uuid NOT NULL,
    appointment_type text NOT NULL CHECK (appointment_type IN ('assessment', 'treatment', 'follow_up', 'clearance', 'therapy')),
    appointment_date timestamptz NOT NULL,
    duration_minutes integer DEFAULT 60,
    provider_name text NOT NULL,
    location text,
    notes text,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    outcome text,
    follow_up_required boolean DEFAULT false,
    next_appointment_date timestamptz,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE rehabilitation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rehabilitation_plans
CREATE POLICY "Players can view their own rehabilitation plans" 
ON rehabilitation_plans 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = rehabilitation_plans.player_id 
    AND players.user_id = auth.uid()
));

CREATE POLICY "Medical staff can manage all rehabilitation plans" 
ON rehabilitation_plans 
FOR ALL 
USING (has_role(auth.uid(), 'medical'::user_role) OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Coaches can view their team's rehabilitation plans" 
ON rehabilitation_plans 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.id = rehabilitation_plans.player_id 
    AND t.coach_id = auth.uid()
));

CREATE POLICY "Parents can view their children's rehabilitation plans" 
ON rehabilitation_plans 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM players p
    JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
    WHERE p.id = rehabilitation_plans.player_id 
    AND pcr.parent_id = auth.uid()
));

-- Create RLS policies for medical_appointments
CREATE POLICY "Players can view their own medical appointments" 
ON medical_appointments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = medical_appointments.player_id 
    AND players.user_id = auth.uid()
));

CREATE POLICY "Medical staff can manage all medical appointments" 
ON medical_appointments 
FOR ALL 
USING (has_role(auth.uid(), 'medical'::user_role) OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Coaches can view their team's medical appointments" 
ON medical_appointments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.id = medical_appointments.player_id 
    AND t.coach_id = auth.uid()
));

CREATE POLICY "Parents can view their children's medical appointments" 
ON medical_appointments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM players p
    JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
    WHERE p.id = medical_appointments.player_id 
    AND pcr.parent_id = auth.uid()
));

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_rehabilitation_plans_updated_at
    BEFORE UPDATE ON rehabilitation_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_appointments_updated_at
    BEFORE UPDATE ON medical_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();