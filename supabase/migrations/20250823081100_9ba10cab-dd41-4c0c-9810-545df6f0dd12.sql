-- Create game_logs table for tracking game performance and statistics
CREATE TABLE public.game_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  game_date DATE NOT NULL,
  opponent TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  field_goals_made INTEGER DEFAULT 0,
  field_goals_attempted INTEGER DEFAULT 0,
  three_points_made INTEGER DEFAULT 0,
  three_points_attempted INTEGER DEFAULT 0,
  free_throws_made INTEGER DEFAULT 0,
  free_throws_attempted INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  plus_minus INTEGER DEFAULT 0,
  game_rating NUMERIC(4,2) DEFAULT 0,
  performance_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for game_logs
CREATE POLICY "Players can view their own game logs" 
ON public.game_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = game_logs.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's game logs" 
ON public.game_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = game_logs.player_id 
  AND pcr.parent_id = auth.uid()
));

CREATE POLICY "Staff, coaches, and super admins can manage game logs" 
ON public.game_logs 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Create drill_plans table for personalized training plans
CREATE TABLE public.drill_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('shooting', 'ball_handling', 'defense', 'conditioning', 'fundamentals')),
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  focus_areas TEXT[] DEFAULT '{}',
  exercises JSONB DEFAULT '[]'::jsonb,
  success_criteria TEXT,
  progress_tracking JSONB DEFAULT '{}'::jsonb,
  ai_recommended BOOLEAN DEFAULT false,
  based_on_evaluation_id UUID,
  assigned_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drill_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for drill_plans
CREATE POLICY "Players can view their own drill plans" 
ON public.drill_plans 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = drill_plans.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's drill plans" 
ON public.drill_plans 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = drill_plans.player_id 
  AND pcr.parent_id = auth.uid()
));

CREATE POLICY "Staff, coaches, and super admins can manage drill plans" 
ON public.drill_plans 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Create training_sessions table for tracking drill completion
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  drill_plan_id UUID,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER DEFAULT 0,
  exercises_completed JSONB DEFAULT '[]'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  fatigue_level INTEGER CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
  focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 10),
  improvement_notes TEXT,
  coach_feedback TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for training_sessions
CREATE POLICY "Players can view their own training sessions" 
ON public.training_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = training_sessions.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's training sessions" 
ON public.training_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = training_sessions.player_id 
  AND pcr.parent_id = auth.uid()
));

CREATE POLICY "Staff, coaches, and super admins can manage training sessions" 
ON public.training_sessions 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Add updated_at trigger to all new tables
CREATE TRIGGER update_game_logs_updated_at
BEFORE UPDATE ON public.game_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drill_plans_updated_at
BEFORE UPDATE ON public.drill_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();