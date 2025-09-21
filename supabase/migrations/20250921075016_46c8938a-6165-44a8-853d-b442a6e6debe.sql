-- Phase 1: Backend Database & Query Optimization (Final Fix)

-- Drop the materialized views to recreate without RLS
DROP MATERIALIZED VIEW IF EXISTS mv_player_performance_analytics;
DROP MATERIALIZED VIEW IF EXISTS mv_health_analytics_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_attendance_analytics;

-- Create regular views instead of materialized views for RLS support
CREATE OR REPLACE VIEW v_player_performance_analytics AS
SELECT 
  p.id as player_id,
  pr.full_name as player_name,
  p.jersey_number,
  t.name as team_name,
  t.id as team_id,
  COUNT(epg.id) as total_evaluations,
  ROUND(AVG(epg.overall), 2) as avg_overall_grade,
  ROUND(AVG(COALESCE((epg.metrics->>'shooting')::numeric, 0)), 2) as avg_shooting,
  ROUND(AVG(COALESCE((epg.metrics->>'passing')::numeric, 0)), 2) as avg_passing,
  ROUND(AVG(COALESCE((epg.metrics->>'dribbling')::numeric, 0)), 2) as avg_dribbling,
  ROUND(AVG(COALESCE((epg.metrics->>'defense')::numeric, 0)), 2) as avg_defense,
  MAX(epg.created_at) as last_evaluation_date,
  CASE 
    WHEN AVG(epg.overall) >= 8 THEN 'excellent'
    WHEN AVG(epg.overall) >= 6 THEN 'good' 
    WHEN AVG(epg.overall) >= 4 THEN 'needs_improvement'
    ELSE 'poor'
  END as performance_level
FROM players p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN player_teams pt ON p.id = pt.player_id AND pt.is_active = true
LEFT JOIN teams t ON pt.team_id = t.id
LEFT JOIN event_player_grades epg ON p.id = epg.player_id
WHERE p.is_active = true
GROUP BY p.id, pr.full_name, p.jersey_number, t.name, t.id;

-- Create health analytics view
CREATE OR REPLACE VIEW v_health_analytics_summary AS
SELECT 
  p.id as player_id,
  pr.full_name as player_name,
  p.jersey_number,
  t.name as team_name,
  COUNT(dhc.id) as total_checkins,
  ROUND(AVG(dhc.energy_level), 2) as avg_energy_level,
  ROUND(AVG(dhc.sleep_quality), 2) as avg_sleep_quality,
  ROUND(AVG(dhc.training_readiness), 2) as avg_training_readiness,
  MAX(dhc.check_in_date) as last_checkin_date,
  COUNT(CASE WHEN hw.injury_status = 'injured' THEN 1 END) as active_injuries,
  ROUND(AVG(hw.fitness_score), 2) as avg_fitness_score
FROM players p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN player_teams pt ON p.id = pt.player_id AND pt.is_active = true
LEFT JOIN teams t ON pt.team_id = t.id
LEFT JOIN daily_health_checkins dhc ON p.id = dhc.player_id
LEFT JOIN health_wellness hw ON p.id = hw.player_id
WHERE p.is_active = true
GROUP BY p.id, pr.full_name, p.jersey_number, t.name;

-- Create attendance analytics view
CREATE OR REPLACE VIEW v_attendance_analytics AS
SELECT 
  p.id as player_id,
  pr.full_name as player_name,
  p.jersey_number,
  t.name as team_name,
  COUNT(a.id) as total_events,
  COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
  COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
  COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
  ROUND(
    (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0) / 
    NULLIF(COUNT(a.id), 0), 2
  ) as attendance_percentage
FROM players p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN player_teams pt ON p.id = pt.player_id AND pt.is_active = true
LEFT JOIN teams t ON pt.team_id = t.id
LEFT JOIN attendance a ON p.id = a.player_id
WHERE p.is_active = true
GROUP BY p.id, pr.full_name, p.jersey_number, t.name;

-- Enhanced RPC function for detailed player analytics (updated to use views)
CREATE OR REPLACE FUNCTION rpc_get_player_analytics_detailed(
  timeframe_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  jersey_number INTEGER,
  team_name TEXT,
  team_id UUID,
  performance_data JSONB,
  health_data JSONB,
  attendance_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vpa.player_id,
    vpa.player_name,
    vpa.jersey_number,
    vpa.team_name,
    vpa.team_id,
    jsonb_build_object(
      'total_evaluations', vpa.total_evaluations,
      'avg_overall_grade', vpa.avg_overall_grade,
      'avg_shooting', vpa.avg_shooting,
      'avg_passing', vpa.avg_passing,
      'avg_dribbling', vpa.avg_dribbling,
      'avg_defense', vpa.avg_defense,
      'last_evaluation_date', vpa.last_evaluation_date,
      'performance_level', vpa.performance_level
    ) as performance_data,
    jsonb_build_object(
      'total_checkins', COALESCE(vha.total_checkins, 0),
      'avg_energy_level', vha.avg_energy_level,
      'avg_sleep_quality', vha.avg_sleep_quality,
      'avg_training_readiness', vha.avg_training_readiness,
      'last_checkin_date', vha.last_checkin_date,
      'active_injuries', COALESCE(vha.active_injuries, 0),
      'avg_fitness_score', vha.avg_fitness_score
    ) as health_data,
    jsonb_build_object(
      'total_events', COALESCE(vaa.total_events, 0),
      'present_count', COALESCE(vaa.present_count, 0),
      'late_count', COALESCE(vaa.late_count, 0),
      'absent_count', COALESCE(vaa.absent_count, 0),
      'excused_count', COALESCE(vaa.excused_count, 0),
      'attendance_percentage', vaa.attendance_percentage
    ) as attendance_data
  FROM v_player_performance_analytics vpa
  LEFT JOIN v_health_analytics_summary vha ON vpa.player_id = vha.player_id
  LEFT JOIN v_attendance_analytics vaa ON vpa.player_id = vaa.player_id
  WHERE (timeframe_days = 0 OR vpa.last_evaluation_date >= CURRENT_DATE - INTERVAL '1 day' * timeframe_days)
  ORDER BY vpa.avg_overall_grade DESC NULLS LAST;
END;
$$;

-- RPC function for real-time health metrics
CREATE OR REPLACE FUNCTION rpc_get_health_metrics_realtime()
RETURNS TABLE(
  total_players BIGINT,
  active_injuries BIGINT,
  avg_fitness_score NUMERIC,
  daily_checkins_today BIGINT,
  checkin_completion_rate NUMERIC,
  recent_checkins JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM players WHERE is_active = true) as total_players,
    (SELECT COUNT(*) FROM health_wellness hw 
     JOIN players p ON hw.player_id = p.id 
     WHERE p.is_active = true AND hw.injury_status = 'injured') as active_injuries,
    (SELECT ROUND(AVG(hw.fitness_score), 2) FROM health_wellness hw 
     JOIN players p ON hw.player_id = p.id 
     WHERE p.is_active = true AND hw.fitness_score IS NOT NULL) as avg_fitness_score,
    (SELECT COUNT(*) FROM daily_health_checkins dhc
     JOIN players p ON dhc.player_id = p.id
     WHERE p.is_active = true AND dhc.check_in_date = CURRENT_DATE) as daily_checkins_today,
    (SELECT ROUND(
      (COUNT(CASE WHEN dhc.check_in_date = CURRENT_DATE THEN 1 END) * 100.0) / 
      NULLIF(COUNT(DISTINCT p.id), 0), 2
    ) FROM players p
    LEFT JOIN daily_health_checkins dhc ON p.id = dhc.player_id
    WHERE p.is_active = true) as checkin_completion_rate,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'player_id', dhc.player_id,
        'player_name', pr.full_name,
        'check_in_date', dhc.check_in_date,
        'energy_level', dhc.energy_level,
        'sleep_quality', dhc.sleep_quality,
        'training_readiness', dhc.training_readiness
      )
    ) FROM daily_health_checkins dhc
    JOIN players p ON dhc.player_id = p.id
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.is_active = true AND dhc.check_in_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY dhc.check_in_date DESC
    LIMIT 20) as recent_checkins;
END;
$$;