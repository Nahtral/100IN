-- Update the RPC function to include status for events
CREATE OR REPLACE FUNCTION rpc_get_player_dashboard_v2(target_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  player_record RECORD;
  recent_performance jsonb;
  active_goals jsonb;
  upcoming_events jsonb;
BEGIN
  -- Get player basic info and metrics
  SELECT 
    p.id, p.user_id, p.first_name, p.last_name, p.jersey_number,
    t.name as team_name, t.id as team_id,
    m.shooting_percentage, m.total_shots, m.total_makes,
    m.fitness_score, m.check_in_streak, m.current_energy_level,
    m.avg_points, m.games_played, m.active_goals_count,
    m.completed_goals_count, m.avg_goal_progress
  INTO player_record
  FROM players p
  LEFT JOIN teams t ON p.team_id = t.id
  LEFT JOIN vw_player_dashboard_metrics m ON p.id = m.player_id
  WHERE p.id = target_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Player not found');
  END IF;

  -- Get recent performance (last 10 sessions)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', 'session-' || DATE(s.created_at) || '-' || ROW_NUMBER() OVER (PARTITION BY DATE(s.created_at) ORDER BY s.created_at),
      'date', DATE(s.created_at),
      'points', COALESCE(daily_stats.total_points, 0),
      'made_shots', daily_stats.made_shots,
      'total_shots', daily_stats.total_shots,
      'percentage', CASE 
        WHEN daily_stats.total_shots > 0 THEN ROUND((daily_stats.made_shots::numeric / daily_stats.total_shots::numeric) * 100, 1)
        ELSE 0 
      END,
      'opponent', 'Training Session'
    )
  ) INTO recent_performance
  FROM (
    SELECT 
      DATE(created_at) as session_date,
      COUNT(*) FILTER (WHERE made = true) as made_shots,
      COUNT(*) as total_shots,
      COUNT(*) FILTER (WHERE made = true) * 2 as total_points
    FROM shots 
    WHERE player_id = target_player_id 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) DESC
    LIMIT 10
  ) daily_stats
  LEFT JOIN shots s ON DATE(s.created_at) = daily_stats.session_date AND s.player_id = target_player_id;

  -- Get active goals
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', dg.id,
      'goal_type', dg.goal_type,
      'metric_name', dg.metric_name,
      'target_value', dg.target_value,
      'current_value', dg.current_value,
      'progress_percentage', CASE 
        WHEN dg.target_value > 0 THEN LEAST(ROUND((dg.current_value::numeric / dg.target_value::numeric) * 100), 100)
        ELSE 0 
      END,
      'priority', dg.priority,
      'notes', dg.notes,
      'is_active', dg.is_active,
      'status', 'active'
    )
  ) INTO active_goals
  FROM development_goals dg
  WHERE dg.player_id = target_player_id AND dg.is_active = true
  ORDER BY dg.priority ASC, dg.created_at DESC;

  -- Get upcoming events (next 5) with status
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'start_time', s.start_time,
      'end_time', s.end_time,
      'event_type', s.event_type,
      'location', l.name,
      'status', COALESCE(s.status, 'scheduled')
    )
  ) INTO upcoming_events
  FROM schedules s
  LEFT JOIN locations l ON s.location_id = l.id
  WHERE s.team_id = player_record.team_id 
  AND s.start_time > NOW()
  ORDER BY s.start_time ASC
  LIMIT 5;

  -- Build final result
  result := jsonb_build_object(
    'player', jsonb_build_object(
      'id', player_record.id,
      'user_id', player_record.user_id,
      'first_name', player_record.first_name,
      'last_name', player_record.last_name,
      'jersey_number', player_record.jersey_number,
      'team_name', player_record.team_name,
      'team_id', player_record.team_id
    ),
    'stats', jsonb_build_object(
      'totalShots', COALESCE(player_record.total_shots, 0),
      'totalMakes', COALESCE(player_record.total_makes, 0),
      'shootingPercentage', COALESCE(player_record.shooting_percentage, 0),
      'avgPoints', COALESCE(player_record.avg_points, 0),
      'gamesPlayed', COALESCE(player_record.games_played, 0),
      'fitnessScore', COALESCE(player_record.fitness_score, 75),
      'checkInStreak', COALESCE(player_record.check_in_streak, 0),
      'energyLevel', COALESCE(player_record.current_energy_level, 5)
    ),
    'recentPerformance', COALESCE(recent_performance, '[]'::jsonb),
    'goals', COALESCE(active_goals, '[]'::jsonb),
    'upcomingEvents', COALESCE(upcoming_events, '[]'::jsonb),
    'goalsSummary', jsonb_build_object(
      'activeCount', COALESCE(player_record.active_goals_count, 0),
      'completedCount', COALESCE(player_record.completed_goals_count, 0),
      'avgProgress', COALESCE(player_record.avg_goal_progress, 0)
    ),
    'lastUpdated', NOW()
  );

  RETURN result;
END;
$$;