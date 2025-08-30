-- Create development goals table for player improvements
CREATE TABLE public.development_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  goal_type TEXT NOT NULL, -- 'percentage', 'rating', 'numeric'
  metric_name TEXT NOT NULL, -- 'Free Throw %', 'Defense Rating', etc.
  current_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  current_display TEXT, -- For display like 'B', '72%'
  target_display TEXT, -- For display like 'A', '85%'
  progress_percentage NUMERIC DEFAULT 0, -- 0-100
  color TEXT DEFAULT 'blue', -- Progress bar color
  priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.development_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Players can view their own development goals" 
ON public.development_goals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.players 
  WHERE players.id = development_goals.player_id 
    AND players.user_id = auth.uid()
));

CREATE POLICY "Medical and coaching staff can manage development goals" 
ON public.development_goals 
FOR ALL 
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_development_goals_updated_at
BEFORE UPDATE ON public.development_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample development goals for testing
INSERT INTO public.development_goals (player_id, goal_type, metric_name, current_value, target_value, current_display, target_display, progress_percentage, color, priority, created_by)
SELECT 
  p.id,
  'percentage',
  'Free Throw %',
  72,
  85,
  '72%',
  '85%',
  72,
  'orange',
  1,
  p.user_id
FROM public.players p
WHERE p.is_active = true
LIMIT 3;

INSERT INTO public.development_goals (player_id, goal_type, metric_name, current_value, target_value, current_display, target_display, progress_percentage, color, priority, created_by)
SELECT 
  p.id,
  'rating',
  'Defense Rating',
  75,
  90,
  'B',
  'A',
  75,
  'blue',
  2,
  p.user_id
FROM public.players p
WHERE p.is_active = true
LIMIT 3;

INSERT INTO public.development_goals (player_id, goal_type, metric_name, current_value, target_value, current_display, target_display, progress_percentage, color, priority, created_by)
SELECT 
  p.id,
  'numeric',
  'Assist Average',
  4.2,
  6.0,
  '4.2',
  '6.0',
  70,
  'green',
  2,
  p.user_id
FROM public.players p
WHERE p.is_active = true
LIMIT 3;