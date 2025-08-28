-- Create a junction table for many-to-many relationship between players and teams
CREATE TABLE public.player_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  team_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role_on_team TEXT DEFAULT 'player',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player_id, team_id)
);

-- Enable RLS
ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

-- Create policies for player_teams
CREATE POLICY "Super admins can manage all player teams"
ON public.player_teams
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff and coaches can view player teams"
ON public.player_teams
FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Players can view their own team assignments"
ON public.player_teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = player_teams.player_id 
    AND p.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_player_teams_updated_at
BEFORE UPDATE ON public.player_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing player team assignments
INSERT INTO public.player_teams (player_id, team_id, assigned_by, assigned_at)
SELECT 
  id as player_id,
  team_id,
  COALESCE(created_by, auth.uid()) as assigned_by,
  created_at as assigned_at
FROM public.players 
WHERE team_id IS NOT NULL;

-- Add index for better performance
CREATE INDEX idx_player_teams_player_id ON public.player_teams(player_id);
CREATE INDEX idx_player_teams_team_id ON public.player_teams(team_id);
CREATE INDEX idx_player_teams_active ON public.player_teams(is_active) WHERE is_active = true;