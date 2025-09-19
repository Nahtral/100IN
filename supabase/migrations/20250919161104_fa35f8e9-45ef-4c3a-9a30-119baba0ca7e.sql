-- Fix RPC function to use correct player-team relationship and create missing view

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS vw_player_dashboard_metrics;

-- Drop existing function first
DROP FUNCTION IF EXISTS public.rpc_get_player_dashboard_v2(uuid);

-- Create the missing view for player dashboard metrics
CREATE VIEW vw_player_dashboard_metrics AS
SELECT 
  p.id as player_id,
  p.user_id,
  COALESCE(stats.total_shots, 0) as total_shots,
  COALESCE(stats.total_makes, 0) as total_makes,
  COALESCE(stats.shooting_percentage, 0) as shooting_percentage,
  COALESCE(stats.total_sessions, 0) as total_sessions,
  COALESCE(attendance_stats.attendance_rate, 0) as attendance_rate,
  COALESCE(health_stats.avg_energy_level, 0) as avg_energy_level,
  COALESCE(health_stats.avg_sleep_hours, 0) as avg_sleep_hours,
  COALESCE(goals_stats.total_goals, 0) as total_goals,
  COALESCE(goals_stats.completed_goals, 0) as completed_goals
FROM players p
LEFT JOIN (
  SELECT 
    player_id,
    COUNT(*) as total_shots,
    COUNT(*) FILTER (WHERE made = true) as total_makes,
    ROUND((COUNT(*) FILTER (WHERE made = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as shooting_percentage,
    COUNT(DISTINCT session_id) as total_sessions
  FROM shots
  GROUP BY player_id
) stats ON p.id = stats.player_id
LEFT JOIN (
  SELECT 
    p.id as player_id,
    ROUND(
      (COUNT(*) FILTER (WHERE a.status IN ('present', 'late'))::numeric / 
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as attendance_rate
  FROM players p
  LEFT JOIN attendance a ON p.id = a.player_id
  GROUP BY p.id
) attendance_stats ON p.id = attendance_stats.player_id
LEFT JOIN (
  SELECT 
    player_id,
    AVG(energy_level) as avg_energy_level,
    AVG(sleep_hours) as avg_sleep_hours
  FROM daily_health_checkins
  WHERE check_in_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY player_id
) health_stats ON p.id = health_stats.player_id
LEFT JOIN (
  SELECT 
    player_id,
    COUNT(*) as total_goals,
    COUNT(*) FILTER (WHERE progress_percentage >= 100) as completed_goals
  FROM development_goals
  WHERE is_active = true
  GROUP BY player_id
) goals_stats ON p.id = goals_stats.player_id
WHERE p.is_active = true;

-- Recreate the RPC function to use correct player-team relationships
CREATE FUNCTION public.rpc_get_player_dashboard_v2(target_player_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  player_user_id uuid;
BEGIN
  -- Get the user_id for the player
  SELECT user_id INTO player_user_id 
  FROM players 
  WHERE id = target_player_id;
  
  -- Check access permissions
  IF NOT (
    auth.uid() = player_user_id OR 
    is_super_admin(auth.uid()) OR 
    has_role(auth.uid(), 'medical'::user_role) OR
    has_role(auth.uid(), 'coach'::user_role) OR
    has_role(auth.uid(), 'staff'::user_role) OR
    EXISTS (
      SELECT 1 FROM parent_child_relationships 
      WHERE parent_id = auth.uid() AND child_id = player_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view player dashboard';
  END IF;

  -- Build the comprehensive dashboard data using correct player-team relationship
  SELECT json_build_object(
    'player', json_build_object(
      'id', p.id,
      'name', pr.full_name,
      'email', pr.email,
      'phone', pr.phone,
      'jersey_number', p.jersey_number,
      'position', p.position,
      'team_name', COALESCE(t.name, 'Unassigned'),
      'team_id', pt.team_id,
      'is_active', p.is_active
    ),
    'stats', json_build_object(
      'total_shots', COALESCE(m.total_shots, 0),
      'total_makes', COALESCE(m.total_makes, 0),
      'shooting_percentage', COALESCE(m.shooting_percentage, 0),
      'total_sessions', COALESCE(m.total_sessions, 0),
      'attendance_rate', COALESCE(m.attendance_rate, 0),
      'avg_energy_level', COALESCE(m.avg_energy_level, 0),
      'avg_sleep_hours', COALESCE(m.avg_sleep_hours, 0)
    ),
    'recent_performance', COALESCE((
      SELECT json_agg(
        json_build_object(
          'date', pe.created_at,
          'metric', pe.metric_name,
          'value', pe.value,
          'notes', pe.notes
        )
      )
      FROM player_performance pe
      WHERE pe.player_id = target_player_id
      ORDER BY pe.created_at DESC
      LIMIT 5
    ), '[]'::json),
    'goals', json_build_object(
      'total', COALESCE(m.total_goals, 0),
      'completed', COALESCE(m.completed_goals, 0),
      'active_goals', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', dg.id,
            'goal_type', dg.goal_type,
            'target_value', dg.target_value,
            'current_value', dg.current_value,
            'progress_percentage', dg.progress_percentage,
            'target_date', dg.target_date
          )
        )
        FROM development_goals dg
        WHERE dg.player_id = target_player_id AND dg.is_active = true
        ORDER BY dg.created_at DESC
        LIMIT 5
      ), '[]'::json)
    ),
    'upcoming_events', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'title', s.title,
          'start_time', s.start_time,
          'end_time', s.end_time,
          'location', l.name,
          'event_type', s.event_type
        )
      )
      FROM schedules s
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN schedule_teams st ON s.id = st.schedule_id
      LEFT JOIN player_teams pt_events ON st.team_id = pt_events.team_id
      WHERE pt_events.player_id = target_player_id 
        AND pt_events.is_active = true
        AND s.start_time >= now()
      ORDER BY s.start_time ASC
      LIMIT 5
    ), '[]'::json),
    'goals_summary', json_build_object(
      'total_goals', COALESCE(m.total_goals, 0),
      'completed_goals', COALESCE(m.completed_goals, 0),
      'completion_rate', CASE 
        WHEN COALESCE(m.total_goals, 0) > 0 
        THEN ROUND((COALESCE(m.completed_goals, 0)::numeric / m.total_goals) * 100, 1)
        ELSE 0 
      END
    ),
    'last_updated', now()
  ) INTO result
  FROM players p
  LEFT JOIN profiles pr ON p.user_id = pr.id
  LEFT JOIN player_teams pt ON p.id = pt.player_id AND pt.is_active = true
  LEFT JOIN teams t ON pt.team_id = t.id
  LEFT JOIN vw_player_dashboard_metrics m ON p.id = m.player_id
  WHERE p.id = target_player_id;

  RETURN COALESCE(result, '{}'::json);
END;
$function$;