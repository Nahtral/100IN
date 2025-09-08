-- First check if player_teams table exists for many-to-many player-team relationships
-- Create player_teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.player_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  team_id UUID NOT NULL,
  role_on_team TEXT NOT NULL DEFAULT 'player',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(player_id, team_id)
);

-- Enable RLS on player_teams table
ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for player_teams
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

CREATE POLICY "Super admins and staff can manage all team assignments" 
ON public.player_teams 
FOR ALL 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

CREATE POLICY "Coaches can view team assignments for their teams" 
ON public.player_teams 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach'::user_role) AND 
  EXISTS (
    SELECT 1 FROM public.coach_assignments ca 
    WHERE ca.coach_id = auth.uid() 
    AND ca.team_id = player_teams.team_id 
    AND ca.status = 'active'
  )
);

-- Create function to get active teams (for the modal dropdown)
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

-- Create function to assign player to team (used during approval process)
CREATE OR REPLACE FUNCTION public.assign_player_to_team(
  target_player_id UUID,
  target_team_id UUID, 
  team_role TEXT DEFAULT 'player',
  assigned_by_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins and staff can assign players to teams
  IF NOT (is_super_admin(assigned_by_user_id) OR has_role(assigned_by_user_id, 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Only super admins and staff can assign players to teams';
  END IF;

  -- Insert or update team assignment
  INSERT INTO public.player_teams (
    player_id, 
    team_id, 
    role_on_team, 
    assigned_by,
    is_active
  ) VALUES (
    target_player_id,
    target_team_id,
    team_role,
    assigned_by_user_id,
    true
  )
  ON CONFLICT (player_id, team_id) 
  DO UPDATE SET 
    role_on_team = team_role,
    is_active = true,
    assigned_by = assigned_by_user_id,
    updated_at = now();

  RETURN json_build_object('success', true, 'message', 'Player assigned to team successfully');
END;
$$;