-- Create functions that are missing from the types
CREATE OR REPLACE FUNCTION public.get_coaches_with_assignments()
RETURNS TABLE(
  coach_id UUID,
  coach_name TEXT,
  coach_email TEXT,
  team_assignments JSONB,
  player_assignments JSONB,
  total_assignments BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as coach_id,
    p.full_name as coach_name,
    p.email as coach_email,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'team_id', t.id,
          'team_name', t.name,
          'assigned_at', ca_team.assigned_at
        )
      ) FILTER (WHERE ca_team.assignment_type = 'team' AND ca_team.status = 'active'),
      '[]'::jsonb
    ) as team_assignments,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'player_id', pl.id,
          'player_name', pl_p.full_name,
          'assigned_at', ca_player.assigned_at
        )
      ) FILTER (WHERE ca_player.assignment_type = 'player' AND ca_player.status = 'active'),
      '[]'::jsonb
    ) as player_assignments,
    COUNT(DISTINCT ca_team.id) + COUNT(DISTINCT ca_player.id) as total_assignments
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN public.coach_assignments ca_team ON p.id = ca_team.coach_id AND ca_team.assignment_type = 'team' AND ca_team.status = 'active'
  LEFT JOIN public.teams t ON ca_team.team_id = t.id
  LEFT JOIN public.coach_assignments ca_player ON p.id = ca_player.coach_id AND ca_player.assignment_type = 'player' AND ca_player.status = 'active'
  LEFT JOIN public.players pl ON ca_player.player_id = pl.id
  LEFT JOIN public.profiles pl_p ON pl.user_id = pl_p.id
  WHERE ur.role = 'coach' AND ur.is_active = true
  GROUP BY p.id, p.full_name, p.email;
$$;

-- Create function to get parent-child relationship requests
CREATE OR REPLACE FUNCTION public.get_parent_child_requests()
RETURNS TABLE(
  request_id UUID,
  parent_name TEXT,
  parent_email TEXT,
  child_name TEXT,
  child_email TEXT,
  relationship_type TEXT,
  status TEXT,
  requested_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pcr.id as request_id,
    p_parent.full_name as parent_name,
    p_parent.email as parent_email,
    p_child.full_name as child_name,
    p_child.email as child_email,
    pcr.relationship_type,
    pcr.status,
    pcr.requested_at
  FROM public.parent_child_relationships pcr
  JOIN public.profiles p_parent ON pcr.parent_id = p_parent.id
  JOIN public.profiles p_child ON pcr.child_id = p_child.id
  ORDER BY pcr.requested_at DESC;
$$;