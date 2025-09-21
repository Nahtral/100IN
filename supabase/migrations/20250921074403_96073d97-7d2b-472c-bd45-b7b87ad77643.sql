-- Phase 1: Backend Database & Query Optimization

-- Create materialized view for player performance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_player_performance_analytics AS
SELECT 
  p.id as player_id,
  pr.full_name as player_name,
  p.jersey_number,
  t.name as team_name,
  t.id as team_id,
  COUNT(epg.id) as total_evaluations,
  ROUND(AVG(epg.overall), 2) as avg_overall_grade,
  ROUND(AVG(epg.shooting), 2) as avg_shooting,
  ROUND(AVG(epg.passing), 2) as avg_passing,
  ROUND(AVG(epg.dribbling), 2) as avg_dribbling,
  ROUND(AVG(epg.defense), 2) as avg_defense,
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mv_player_performance_analytics_performance_level 
ON mv_player_performance_analytics(performance_level);
CREATE INDEX IF NOT EXISTS idx_mv_player_performance_analytics_team 
ON mv_player_performance_analytics(team_id);

-- Create materialized view for health analytics summary  
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_health_analytics_summary AS
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

-- Create materialized view for attendance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_analytics AS
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

-- Enhanced RPC function for detailed player analytics
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
    mpa.player_id,
    mpa.player_name,
    mpa.jersey_number,
    mpa.team_name,
    mpa.team_id,
    jsonb_build_object(
      'total_evaluations', mpa.total_evaluations,
      'avg_overall_grade', mpa.avg_overall_grade,
      'avg_shooting', mpa.avg_shooting,
      'avg_passing', mpa.avg_passing,
      'avg_dribbling', mpa.avg_dribbling,
      'avg_defense', mpa.avg_defense,
      'last_evaluation_date', mpa.last_evaluation_date,
      'performance_level', mpa.performance_level
    ) as performance_data,
    jsonb_build_object(
      'total_checkins', COALESCE(mha.total_checkins, 0),
      'avg_energy_level', mha.avg_energy_level,
      'avg_sleep_quality', mha.avg_sleep_quality,
      'avg_training_readiness', mha.avg_training_readiness,
      'last_checkin_date', mha.last_checkin_date,
      'active_injuries', COALESCE(mha.active_injuries, 0),
      'avg_fitness_score', mha.avg_fitness_score
    ) as health_data,
    jsonb_build_object(
      'total_events', COALESCE(maa.total_events, 0),
      'present_count', COALESCE(maa.present_count, 0),
      'late_count', COALESCE(maa.late_count, 0),
      'absent_count', COALESCE(maa.absent_count, 0),
      'excused_count', COALESCE(maa.excused_count, 0),
      'attendance_percentage', maa.attendance_percentage
    ) as attendance_data
  FROM mv_player_performance_analytics mpa
  LEFT JOIN mv_health_analytics_summary mha ON mpa.player_id = mha.player_id
  LEFT JOIN mv_attendance_analytics maa ON mpa.player_id = maa.player_id
  WHERE (timeframe_days = 0 OR mpa.last_evaluation_date >= CURRENT_DATE - INTERVAL '1 day' * timeframe_days)
  ORDER BY mpa.avg_overall_grade DESC NULLS LAST;
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

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_player_performance_analytics;
  REFRESH MATERIALIZED VIEW mv_health_analytics_summary;
  REFRESH MATERIALIZED VIEW mv_attendance_analytics;
END;
$$;

-- Create triggers to refresh views when data changes
CREATE OR REPLACE FUNCTION trigger_refresh_analytics_views()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use pg_notify to trigger async refresh
  PERFORM pg_notify('refresh_analytics', 'views_updated');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_refresh_on_event_player_grades ON event_player_grades;
DROP TRIGGER IF EXISTS trigger_refresh_on_daily_health_checkins ON daily_health_checkins;
DROP TRIGGER IF EXISTS trigger_refresh_on_attendance ON attendance;

-- Create triggers for automatic view refresh
CREATE TRIGGER trigger_refresh_on_event_player_grades
  AFTER INSERT OR UPDATE OR DELETE ON event_player_grades
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics_views();

CREATE TRIGGER trigger_refresh_on_daily_health_checkins
  AFTER INSERT OR UPDATE OR DELETE ON daily_health_checkins
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics_views();

CREATE TRIGGER trigger_refresh_on_attendance
  AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics_views();

-- Enable RLS on materialized views
ALTER TABLE mv_player_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_health_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_attendance_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for materialized views
CREATE POLICY "Super admins can view performance analytics" 
ON mv_player_performance_analytics FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view health analytics" 
ON mv_health_analytics_summary FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view attendance analytics" 
ON mv_attendance_analytics FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Initial refresh of views
SELECT refresh_analytics_views();