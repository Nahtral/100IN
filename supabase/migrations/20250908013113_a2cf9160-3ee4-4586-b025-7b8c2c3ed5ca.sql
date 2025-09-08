-- Update teams table to add is_active column if it doesn't exist
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create the get_active_teams function
CREATE OR REPLACE FUNCTION public.get_active_teams()
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name 
  FROM public.teams t 
  WHERE t.is_active = true 
  ORDER BY t.name;
$$;

-- Create function to get player team assignments with team names
CREATE OR REPLACE FUNCTION public.get_player_team_assignments(player_user_id UUID)
RETURNS TABLE(
  assignment_id UUID,
  team_id UUID, 
  team_name TEXT,
  role_on_team TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pt.id as assignment_id,
    pt.team_id,
    t.name as team_name,
    pt.role_on_team,
    pt.assigned_at,
    pt.is_active
  FROM public.player_teams pt
  JOIN public.teams t ON pt.team_id = t.id
  JOIN public.players p ON pt.player_id = p.id
  WHERE p.user_id = player_user_id
  AND pt.is_active = true
  ORDER BY pt.assigned_at DESC;
$$;