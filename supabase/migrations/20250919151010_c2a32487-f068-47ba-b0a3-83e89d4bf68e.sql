-- Phase 1: Create Materialized Views for Player Dashboard Metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_player_dashboard_metrics AS
SELECT 
  p.id as player_id,
  p.user_id,
  -- Shooting metrics
  COALESCE(shots_stats.total_shots, 0) as total_shots,
  COALESCE(shots_stats.total_makes, 0) as total_makes,
  CASE 
    WHEN shots_stats.total_shots > 0 THEN ROUND((shots_stats.total_makes::numeric / shots_stats.total_shots::numeric) * 100, 1)
    ELSE 0 
  END as shooting_percentage,
  
  -- Health/Fitness metrics
  COALESCE(health_stats.avg_fitness_score, 75) as fitness_score,
  COALESCE(health_stats.check_in_streak, 0) as check_in_streak,
  COALESCE(health_stats.energy_level, 5) as current_energy_level,
  
  -- Performance metrics
  COALESCE(perf_stats.avg_points, 0) as avg_points,
  COALESCE(perf_stats.sessions_count, 0) as games_played,
  
  -- Goals metrics
  COALESCE(goals_stats.active_goals, 0) as active_goals_count,
  COALESCE(goals_stats.completed_goals, 0) as completed_goals_count,
  COALESCE(goals_stats.avg_progress, 0) as avg_goal_progress,
  
  -- Timestamps
  NOW() as last_updated
FROM players p
LEFT JOIN (
  -- Shooting statistics
  SELECT 
    player_id,
    COUNT(*) as total_shots,
    COUNT(*) FILTER (WHERE made = true) as total_makes
  FROM shots 
  GROUP BY player_id
) shots_stats ON p.id = shots_stats.player_id
LEFT JOIN (
  -- Health statistics (last 30 days)
  SELECT 
    player_id,
    AVG(COALESCE(energy_level, 5) * 10) as avg_fitness_score,
    AVG(energy_level) as energy_level,
    -- Calculate streak
    (
      SELECT COUNT(*) 
      FROM daily_health_checkins dhc2 
      WHERE dhc2.player_id = dhc.player_id 
      AND dhc2.check_in_date >= CURRENT_DATE - INTERVAL '30 days'
      AND dhc2.check_in_date <= CURRENT_DATE
    ) as check_in_streak
  FROM daily_health_checkins dhc
  WHERE dhc.check_in_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY player_id
) health_stats ON p.id = health_stats.player_id
LEFT JOIN (
  -- Performance statistics (last 30 days)
  SELECT 
    player_id,
    AVG(points) as avg_points,
    COUNT(DISTINCT DATE(created_at)) as sessions_count
  FROM player_performance
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY player_id
) perf_stats ON p.id = perf_stats.player_id
LEFT JOIN (
  -- Goals statistics
  SELECT 
    player_id,
    COUNT(*) as active_goals,
    COUNT(*) FILTER (WHERE current_value >= target_value) as completed_goals,
    AVG(
      CASE 
        WHEN target_value > 0 THEN LEAST((current_value::numeric / target_value::numeric) * 100, 100)
        ELSE 0 
      END
    ) as avg_progress
  FROM development_goals
  WHERE is_active = true
  GROUP BY player_id
) goals_stats ON p.id = goals_stats.player_id;

-- Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_dashboard_metrics_player_id ON vw_player_dashboard_metrics (player_id);
CREATE INDEX IF NOT EXISTS idx_player_dashboard_metrics_user_id ON vw_player_dashboard_metrics (user_id);

-- Phase 2: Create RPC function for unified dashboard data
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

  -- Get upcoming events (next 5)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'start_time', s.start_time,
      'end_time', s.end_time,
      'event_type', s.event_type,
      'location', l.name
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

-- Phase 3: Create trigger function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_player_dashboard_metrics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_player_dashboard_metrics;
  RETURN NULL;
END;
$$;

-- Create triggers to refresh materialized view on data changes
DROP TRIGGER IF EXISTS trigger_refresh_dashboard_on_shots ON shots;
CREATE TRIGGER trigger_refresh_dashboard_on_shots
  AFTER INSERT OR UPDATE OR DELETE ON shots
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_player_dashboard_metrics();

DROP TRIGGER IF EXISTS trigger_refresh_dashboard_on_health ON daily_health_checkins;
CREATE TRIGGER trigger_refresh_dashboard_on_health
  AFTER INSERT OR UPDATE OR DELETE ON daily_health_checkins
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_player_dashboard_metrics();

DROP TRIGGER IF EXISTS trigger_refresh_dashboard_on_goals ON development_goals;
CREATE TRIGGER trigger_refresh_dashboard_on_goals
  AFTER INSERT OR UPDATE OR DELETE ON development_goals
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_player_dashboard_metrics();

DROP TRIGGER IF EXISTS trigger_refresh_dashboard_on_performance ON player_performance;
CREATE TRIGGER trigger_refresh_dashboard_on_performance
  AFTER INSERT OR UPDATE OR DELETE ON player_performance
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_player_dashboard_metrics();

-- Grant permissions
GRANT SELECT ON vw_player_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_player_dashboard_v2(uuid) TO authenticated;