-- Create daily_health_checkins table for player daily check-ins
CREATE TABLE public.daily_health_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  sleep_hours NUMERIC(3,1),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  soreness_level INTEGER CHECK (soreness_level >= 1 AND soreness_level <= 10),
  soreness_areas TEXT[],
  hydration_level INTEGER CHECK (hydration_level >= 1 AND hydration_level <= 10),
  nutrition_quality INTEGER CHECK (nutrition_quality >= 1 AND nutrition_quality <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, check_in_date)
);

-- Create injury_reports table
CREATE TABLE public.injury_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  injury_type TEXT NOT NULL,
  injury_location TEXT NOT NULL,
  injury_description TEXT NOT NULL,
  severity_level TEXT NOT NULL CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  date_occurred DATE NOT NULL,
  symptoms TEXT[],
  treatment_received TEXT,
  return_to_play_date DATE,
  medical_clearance_required BOOLEAN DEFAULT false,
  medical_clearance_received BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'recovering', 'cleared')),
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_communications table
CREATE TABLE public.medical_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('player', 'parent', 'coach', 'staff', 'medical', 'all')),
  recipient_ids UUID[],
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  communication_type TEXT NOT NULL CHECK (communication_type IN ('general', 'injury_update', 'health_alert', 'return_to_play')),
  related_player_id UUID,
  is_read_by JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.daily_health_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injury_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_health_checkins
CREATE POLICY "Players can manage their own check-ins" 
ON public.daily_health_checkins 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = daily_health_checkins.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = daily_health_checkins.player_id 
  AND pcr.parent_id = auth.uid()
));

CREATE POLICY "Coaches can view their team's check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN teams t ON p.team_id = t.id
  WHERE p.id = daily_health_checkins.player_id 
  AND t.coach_id = auth.uid()
));

CREATE POLICY "Medical staff can view all check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
USING (has_role(auth.uid(), 'medical'::user_role) OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

-- RLS Policies for injury_reports
CREATE POLICY "Players can view their own injury reports" 
ON public.injury_reports 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = injury_reports.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's injury reports" 
ON public.injury_reports 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = injury_reports.player_id 
  AND pcr.parent_id = auth.uid()
));

CREATE POLICY "Coaches can view their team's injury reports" 
ON public.injury_reports 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN teams t ON p.team_id = t.id
  WHERE p.id = injury_reports.player_id 
  AND t.coach_id = auth.uid()
));

CREATE POLICY "Medical staff can manage all injury reports" 
ON public.injury_reports 
FOR ALL 
USING (has_role(auth.uid(), 'medical'::user_role) OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Authorized users can create injury reports" 
ON public.injury_reports 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'medical'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = injury_reports.player_id 
    AND players.user_id = auth.uid()
  )
);

-- RLS Policies for medical_communications
CREATE POLICY "Users can view communications sent to them" 
ON public.medical_communications 
FOR SELECT 
USING (
  auth.uid() = ANY(recipient_ids) OR 
  sender_id = auth.uid() OR
  (recipient_type = 'all') OR
  (recipient_type = 'player' AND EXISTS (
    SELECT 1 FROM players WHERE user_id = auth.uid()
  )) OR
  (recipient_type = 'parent' AND EXISTS (
    SELECT 1 FROM parent_child_relationships WHERE parent_id = auth.uid()
  )) OR
  (recipient_type = 'coach' AND has_role(auth.uid(), 'coach'::user_role)) OR
  (recipient_type = 'staff' AND has_role(auth.uid(), 'staff'::user_role)) OR
  (recipient_type = 'medical' AND has_role(auth.uid(), 'medical'::user_role))
);

CREATE POLICY "Medical staff can create communications" 
ON public.medical_communications 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'medical'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Senders can update their communications" 
ON public.medical_communications 
FOR UPDATE 
USING (sender_id = auth.uid());

-- Create triggers for updated_at columns
CREATE TRIGGER update_daily_health_checkins_updated_at
  BEFORE UPDATE ON public.daily_health_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_injury_reports_updated_at
  BEFORE UPDATE ON public.injury_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_communications_updated_at
  BEFORE UPDATE ON public.medical_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();