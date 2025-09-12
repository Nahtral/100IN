-- Create event player grades table for comprehensive player assessment
CREATE TABLE public.event_player_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  graded_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- 16 Skill Categories (1-10 scale)
  shooting SMALLINT CHECK (shooting >= 1 AND shooting <= 10),
  ball_handling SMALLINT CHECK (ball_handling >= 1 AND ball_handling <= 10),
  passing SMALLINT CHECK (passing >= 1 AND passing <= 10),
  rebounding SMALLINT CHECK (rebounding >= 1 AND rebounding <= 10),
  footwork SMALLINT CHECK (footwork >= 1 AND footwork <= 10),
  decision_making SMALLINT CHECK (decision_making >= 1 AND decision_making <= 10),
  consistency SMALLINT CHECK (consistency >= 1 AND consistency <= 10),
  communication SMALLINT CHECK (communication >= 1 AND communication <= 10),
  cutting SMALLINT CHECK (cutting >= 1 AND cutting <= 10),
  teammate_support SMALLINT CHECK (teammate_support >= 1 AND teammate_support <= 10),
  competitiveness SMALLINT CHECK (competitiveness >= 1 AND competitiveness <= 10),
  coachable SMALLINT CHECK (coachable >= 1 AND coachable <= 10),
  leadership SMALLINT CHECK (leadership >= 1 AND leadership <= 10),
  reaction_time SMALLINT CHECK (reaction_time >= 1 AND reaction_time <= 10),
  game_iq SMALLINT CHECK (game_iq >= 1 AND game_iq <= 10),
  boxout_frequency SMALLINT CHECK (boxout_frequency >= 1 AND boxout_frequency <= 10),
  court_vision SMALLINT CHECK (court_vision >= 1 AND court_vision <= 10),
  
  -- Auto-calculated fields
  overall_grade NUMERIC(4,2),
  
  -- Additional metadata
  notes TEXT,
  event_type TEXT NOT NULL,
  grading_session_id UUID DEFAULT gen_random_uuid(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one grade per player per event
  UNIQUE(schedule_id, player_id)
);

-- Enable RLS
ALTER TABLE public.event_player_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Coaches and super admins can view all grades"
ON public.event_player_grades
FOR SELECT
USING (
  public.has_role(auth.uid(), 'coach'::public.user_role) OR 
  public.has_role(auth.uid(), 'staff'::public.user_role) OR 
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Coaches and super admins can insert grades"
ON public.event_player_grades
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'coach'::public.user_role) OR 
  public.has_role(auth.uid(), 'staff'::public.user_role) OR 
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Graders can update their own grades"
ON public.event_player_grades
FOR UPDATE
USING (
  graded_by = auth.uid() OR 
  public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can delete grades"
ON public.event_player_grades
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Players can view their own grades
CREATE POLICY "Players can view their own grades"
ON public.event_player_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = event_player_grades.player_id AND p.user_id = auth.uid()
  )
);

-- Function to automatically calculate overall grade
CREATE OR REPLACE FUNCTION public.calculate_overall_grade()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average of all non-null skill scores
  NEW.overall_grade := (
    COALESCE(NEW.shooting, 0) + 
    COALESCE(NEW.ball_handling, 0) + 
    COALESCE(NEW.passing, 0) + 
    COALESCE(NEW.rebounding, 0) + 
    COALESCE(NEW.footwork, 0) + 
    COALESCE(NEW.decision_making, 0) + 
    COALESCE(NEW.consistency, 0) + 
    COALESCE(NEW.communication, 0) + 
    COALESCE(NEW.cutting, 0) + 
    COALESCE(NEW.teammate_support, 0) + 
    COALESCE(NEW.competitiveness, 0) + 
    COALESCE(NEW.coachable, 0) + 
    COALESCE(NEW.leadership, 0) + 
    COALESCE(NEW.reaction_time, 0) + 
    COALESCE(NEW.game_iq, 0) + 
    COALESCE(NEW.boxout_frequency, 0) + 
    COALESCE(NEW.court_vision, 0)
  ) / 17.0;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-calculating overall grade
CREATE TRIGGER calculate_overall_grade_trigger
  BEFORE INSERT OR UPDATE ON public.event_player_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_overall_grade();

-- Index for performance
CREATE INDEX idx_event_player_grades_schedule_id ON public.event_player_grades(schedule_id);
CREATE INDEX idx_event_player_grades_player_id ON public.event_player_grades(player_id);
CREATE INDEX idx_event_player_grades_graded_by ON public.event_player_grades(graded_by);
CREATE INDEX idx_event_player_grades_created_at ON public.event_player_grades(created_at DESC);