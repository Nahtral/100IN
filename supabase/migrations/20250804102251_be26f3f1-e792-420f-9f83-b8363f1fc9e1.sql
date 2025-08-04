-- Create shotiq_settings table
CREATE TABLE public.shotiq_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shotiq_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Players can manage their own ShotIQ settings" 
ON public.shotiq_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.players 
  WHERE players.id = shotiq_settings.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Coaches can view their team's ShotIQ settings" 
ON public.shotiq_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = shotiq_settings.player_id 
  AND t.coach_id = auth.uid()
));

CREATE POLICY "Staff and super admins can manage all ShotIQ settings" 
ON public.shotiq_settings 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'super_admin'::user_role)
);

-- Create drill_messages table
CREATE TABLE public.drill_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  session_id UUID,
  drill_type TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'improvement',
  priority TEXT NOT NULL DEFAULT 'medium',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drill_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Players can view their own drill messages" 
ON public.drill_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.players 
  WHERE players.id = drill_messages.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Coaches can manage their team's drill messages" 
ON public.drill_messages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = drill_messages.player_id 
  AND t.coach_id = auth.uid()
));

CREATE POLICY "Staff and super admins can manage all drill messages" 
ON public.drill_messages 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'super_admin'::user_role)
);

-- Add updated_at trigger for shotiq_settings
CREATE TRIGGER update_shotiq_settings_updated_at
  BEFORE UPDATE ON public.shotiq_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for drill_messages  
CREATE TRIGGER update_drill_messages_updated_at
  BEFORE UPDATE ON public.drill_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();