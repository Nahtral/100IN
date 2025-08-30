-- Create membership tracking system

-- 1. Create membership_types table
CREATE TABLE public.membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('CLASS_COUNT', 'UNLIMITED', 'DATE_RANGE')),
  allocated_classes INTEGER NULL,
  start_date_required BOOLEAN DEFAULT false,
  end_date_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create player_memberships table
CREATE TABLE public.player_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,
  allocated_classes_override INTEGER NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'PAUSED')) DEFAULT 'ACTIVE',
  auto_deactivate_when_used_up BOOLEAN DEFAULT true,
  manual_override_active BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create membership_alerts_sent table
CREATE TABLE public.membership_alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_membership_id UUID NOT NULL REFERENCES public.player_memberships(id) ON DELETE CASCADE,
  alert_code TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_membership_id, alert_code)
);

-- 4. Create membership_adjustments table for admin usage adjustments
CREATE TABLE public.membership_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_membership_id UUID NOT NULL REFERENCES public.player_memberships(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Add deactivation reason to players table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'deactivation_reason') THEN
    ALTER TABLE public.players ADD COLUMN deactivation_reason TEXT NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX idx_player_memberships_player_status ON public.player_memberships(player_id, status);
CREATE INDEX idx_membership_alerts_sent_membership_alert ON public.membership_alerts_sent(player_membership_id, alert_code);
CREATE INDEX idx_players_active ON public.players(is_active);

-- Create view for membership usage calculations
CREATE OR REPLACE VIEW public.vw_player_membership_usage AS
WITH attendance_counts AS (
  SELECT 
    pa.player_id,
    pm.id as membership_id,
    COUNT(*) FILTER (WHERE pa.status = 'present') as used_classes
  FROM public.player_memberships pm
  JOIN public.players p ON p.id = pm.player_id
  LEFT JOIN public.player_attendance pa ON pa.player_id = pm.player_id 
    AND pa.created_at >= pm.start_date
    AND (pm.end_date IS NULL OR pa.created_at <= pm.end_date + INTERVAL '1 day')
  WHERE pm.status = 'ACTIVE'
  GROUP BY pa.player_id, pm.id
),
membership_summary AS (
  SELECT 
    pm.id as membership_id,
    pm.player_id,
    p.full_name as player_name,
    mt.name as membership_type_name,
    mt.allocation_type,
    pm.start_date,
    pm.end_date,
    pm.status,
    pm.auto_deactivate_when_used_up,
    pm.manual_override_active,
    COALESCE(pm.allocated_classes_override, mt.allocated_classes) as allocated_classes,
    COALESCE(ac.used_classes, 0) as used_classes,
    CASE 
      WHEN mt.allocation_type = 'CLASS_COUNT' THEN 
        GREATEST(COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) - COALESCE(ac.used_classes, 0), 0)
      ELSE NULL
    END as remaining_classes,
    CASE 
      WHEN mt.allocation_type = 'DATE_RANGE' AND pm.end_date IS NOT NULL THEN
        GREATEST(0, pm.end_date - CURRENT_DATE)
      ELSE NULL
    END as days_left,
    CASE 
      WHEN mt.allocation_type = 'DATE_RANGE' AND pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as is_expired,
    CASE 
      WHEN pm.manual_override_active = true THEN false
      WHEN mt.allocation_type = 'CLASS_COUNT' AND pm.auto_deactivate_when_used_up = true 
        AND COALESCE(ac.used_classes, 0) >= COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) THEN true
      WHEN mt.allocation_type = 'DATE_RANGE' AND pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as should_deactivate
  FROM public.player_memberships pm
  JOIN public.membership_types mt ON mt.id = pm.membership_type_id
  JOIN public.players p ON p.id = pm.player_id
  LEFT JOIN attendance_counts ac ON ac.membership_id = pm.id
  WHERE pm.status = 'ACTIVE'
)
SELECT * FROM membership_summary;

-- Create function to get membership summary for a specific player
CREATE OR REPLACE FUNCTION public.fn_get_membership_summary(target_player_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(summary)
  FROM (
    SELECT 
      allocated_classes,
      used_classes,
      remaining_classes,
      status,
      membership_type_name as type,
      days_left,
      should_deactivate,
      is_expired,
      start_date,
      end_date,
      allocation_type
    FROM vw_player_membership_usage 
    WHERE player_id = target_player_id
    ORDER BY start_date DESC
    LIMIT 1
  ) summary;
$$;

-- Create function for auto-deactivation
CREATE OR REPLACE FUNCTION public.fn_auto_deactivate_players()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deactivated_count INTEGER := 0;
  player_record RECORD;
BEGIN
  FOR player_record IN 
    SELECT DISTINCT player_id, player_name
    FROM vw_player_membership_usage 
    WHERE should_deactivate = true
  LOOP
    -- Deactivate player
    UPDATE players 
    SET is_active = false, 
        deactivation_reason = 'Membership used up / expired',
        updated_at = now()
    WHERE id = player_record.player_id;
    
    -- Update membership status
    UPDATE player_memberships 
    SET status = 'INACTIVE',
        updated_at = now()
    WHERE player_id = player_record.player_id AND status = 'ACTIVE';
    
    deactivated_count := deactivated_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deactivated_count', deactivated_count,
    'timestamp', now()
  );
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership_types
CREATE POLICY "Super admins can manage membership types" ON public.membership_types
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Coaches can view membership types" ON public.membership_types
  FOR SELECT USING (has_role(auth.uid(), 'coach'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

-- RLS Policies for player_memberships
CREATE POLICY "Super admins can manage all player memberships" ON public.player_memberships
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Coaches can view player memberships" ON public.player_memberships
  FOR SELECT USING (has_role(auth.uid(), 'coach'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Players can view their own memberships" ON public.player_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = player_memberships.player_id 
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's memberships" ON public.player_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
      WHERE p.id = player_memberships.player_id 
      AND pcr.parent_id = auth.uid()
    )
  );

-- RLS Policies for membership_alerts_sent
CREATE POLICY "Super admins can manage membership alerts" ON public.membership_alerts_sent
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view membership alerts" ON public.membership_alerts_sent
  FOR SELECT USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role));

-- RLS Policies for membership_adjustments
CREATE POLICY "Super admins can manage membership adjustments" ON public.membership_adjustments
  FOR ALL USING (is_super_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_membership_types_updated_at
  BEFORE UPDATE ON public.membership_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_memberships_updated_at
  BEFORE UPDATE ON public.player_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default membership types
INSERT INTO public.membership_types (name, allocation_type, allocated_classes) VALUES
  ('8-Class Pack', 'CLASS_COUNT', 8),
  ('12-Class Pack', 'CLASS_COUNT', 12),
  ('Unlimited Monthly', 'UNLIMITED', NULL),
  ('Season Pass', 'DATE_RANGE', NULL);