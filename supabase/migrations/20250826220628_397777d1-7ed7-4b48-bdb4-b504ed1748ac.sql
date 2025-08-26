-- Create indexes for better performance on attendance queries
CREATE INDEX IF NOT EXISTS idx_player_attendance_schedule_player 
ON public.player_attendance(schedule_id, player_id);

CREATE INDEX IF NOT EXISTS idx_player_attendance_player_id 
ON public.player_attendance(player_id);

CREATE INDEX IF NOT EXISTS idx_players_team_id 
ON public.players(team_id);

CREATE INDEX IF NOT EXISTS idx_players_active 
ON public.players(is_active) WHERE is_active = true;

-- Create a table for manual players (external teams, younger kids)
CREATE TABLE IF NOT EXISTS public.manual_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on manual_players
ALTER TABLE public.manual_players ENABLE ROW LEVEL SECURITY;

-- Create policies for manual_players
CREATE POLICY "Staff, coaches, and super admins can manage manual players" 
ON public.manual_players 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Add trigger for updating updated_at
CREATE TRIGGER update_manual_players_updated_at
BEFORE UPDATE ON public.manual_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();