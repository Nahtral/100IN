-- Create development_goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.development_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player_performance table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.player_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  schedule_id UUID,
  performance_date DATE NOT NULL,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  field_goals_made INTEGER DEFAULT 0,
  field_goals_attempted INTEGER DEFAULT 0,
  three_pointers_made INTEGER DEFAULT 0,
  three_pointers_attempted INTEGER DEFAULT 0,
  free_throws_made INTEGER DEFAULT 0,
  free_throws_attempted INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  opponent TEXT,
  performance_type TEXT NOT NULL DEFAULT 'game',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.development_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for development_goals
CREATE POLICY "Players can view their own goals" ON public.development_goals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.players WHERE id = development_goals.player_id AND user_id = auth.uid())
);

CREATE POLICY "Medical and coaching staff can view goals" ON public.development_goals
FOR SELECT USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Staff and coaches can manage goals" ON public.development_goals
FOR ALL USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

-- RLS Policies for player_performance
CREATE POLICY "Players can view their own performance" ON public.player_performance
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.players WHERE id = player_performance.player_id AND user_id = auth.uid())
);

CREATE POLICY "Staff and coaches can view all performance" ON public.player_performance
FOR SELECT USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Staff and coaches can manage performance" ON public.player_performance
FOR ALL USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Enable realtime
ALTER TABLE public.development_goals REPLICA IDENTITY FULL;
ALTER TABLE public.player_performance REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.development_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_performance;

-- Create function to auto-update goal progress
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update shooting percentage goals based on shots data
  UPDATE public.development_goals 
  SET current_value = (
    SELECT CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE made = true)::NUMERIC / COUNT(*)) * 100, 1)
      ELSE 0 
    END
    FROM public.shots s
    JOIN public.players p ON s.player_id = p.id
    WHERE p.id = NEW.player_id
  ),
  updated_at = now()
  WHERE player_id = NEW.player_id AND goal_type = 'shooting_percentage';

  -- Update fitness goals based on health check-ins
  UPDATE public.development_goals 
  SET current_value = (
    SELECT COALESCE(AVG(
      (COALESCE(energy_level, 0) + 
       COALESCE(training_readiness, 0) + 
       (10 - COALESCE(soreness_level, 0))) / 3.0 * 10
    ), 0)
    FROM public.daily_health_checkins dhc
    JOIN public.players p ON dhc.player_id = p.id
    WHERE p.id = NEW.player_id 
      AND dhc.check_in_date >= (CURRENT_DATE - INTERVAL '30 days')
  ),
  updated_at = now()
  WHERE player_id = NEW.player_id AND goal_type = 'fitness_score';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for auto-updating goals
CREATE OR REPLACE TRIGGER update_shooting_goals_on_shot
  AFTER INSERT OR UPDATE ON public.shots
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();

CREATE OR REPLACE TRIGGER update_fitness_goals_on_checkin
  AFTER INSERT OR UPDATE ON public.daily_health_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();