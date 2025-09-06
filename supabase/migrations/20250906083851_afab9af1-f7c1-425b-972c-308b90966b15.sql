-- Clear existing test data and create comprehensive realistic data
-- Handle foreign key constraints properly

-- Clear existing seed data first (keep user data)
DELETE FROM daily_health_checkins WHERE player_id IN (SELECT id FROM players);
DELETE FROM health_wellness WHERE player_id IN (SELECT id FROM players);
DELETE FROM player_performance WHERE player_id IN (SELECT id FROM players);
DELETE FROM shots WHERE player_id IN (SELECT id FROM players);
DELETE FROM shot_sessions WHERE player_id IN (SELECT id FROM players);
DELETE FROM team_attendance;
DELETE FROM analytics_events WHERE event_type IN ('login', 'page_view', 'shot_tracking', 'health_checkin', 'data_access');

-- Insert shot sessions first (required for shots foreign key)
INSERT INTO shot_sessions (
  id,
  player_id,
  session_name,
  start_time,
  end_time,
  total_shots,
  shots_made,
  shooting_percentage,
  session_type,
  created_at
)
SELECT 
  gen_random_uuid(),
  p.id,
  'Practice Session ' || gs,
  NOW() - (gs * INTERVAL '3 days') - INTERVAL '1 hour',
  NOW() - (gs * INTERVAL '3 days'),
  50,
  (random() * 25 + 15)::integer,
  (random() * 40 + 40)::numeric,
  'practice',
  NOW() - (gs * INTERVAL '3 days')
FROM players p
CROSS JOIN generate_series(1, 5) gs;

-- Player performance data (10 games per player)
INSERT INTO player_performance (
  player_id, 
  game_date, 
  opponent,
  points, 
  rebounds, 
  assists, 
  steals, 
  blocks, 
  turnovers, 
  field_goals_made, 
  field_goals_attempted, 
  free_throws_made, 
  free_throws_attempted, 
  minutes_played
)
SELECT 
  p.id,
  CURRENT_DATE - (gs * INTERVAL '7 days'),
  CASE (random() * 4)::integer
    WHEN 0 THEN 'Thunder Hawks'
    WHEN 1 THEN 'Lightning Bolts'
    WHEN 2 THEN 'Fire Eagles'
    ELSE 'Storm Riders'
  END,
  (random() * 25 + 5)::integer,
  (random() * 12 + 2)::integer,
  (random() * 8 + 1)::integer,
  (random() * 4)::integer,
  (random() * 3)::integer,
  (random() * 5 + 1)::integer,
  (random() * 12 + 2)::integer,
  (random() * 8 + 15)::integer,
  (random() * 6 + 2)::integer,
  (random() * 4 + 8)::integer,
  (random() * 15 + 25)::integer
FROM players p
CROSS JOIN generate_series(1, 10) gs;

-- Health wellness data (30 days per player)
INSERT INTO health_wellness (
  player_id,
  date,
  weight,
  body_fat_percentage,
  fitness_score,
  injury_status,
  injury_description,
  medical_notes,
  created_by
)
SELECT 
  p.id,
  CURRENT_DATE - (gs * INTERVAL '1 day'),
  70 + (random() * 30),
  8 + (random() * 7),
  (random() * 40 + 60)::integer,
  CASE 
    WHEN random() < 0.1 THEN 'injured'
    WHEN random() < 0.3 THEN 'recovering'
    ELSE 'healthy'
  END,
  CASE 
    WHEN random() < 0.1 THEN 'Minor ankle sprain'
    WHEN random() < 0.2 THEN 'Muscle soreness'
    ELSE NULL
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Regular monitoring required'
    ELSE 'All clear'
  END,
  (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1)
FROM players p
CROSS JOIN generate_series(1, 30) gs;

-- Daily health check-ins (14 days per player)
INSERT INTO daily_health_checkins (
  player_id,
  check_in_date,
  energy_level,
  sleep_hours,
  sleep_quality,
  soreness_level,
  hydration_level,
  nutrition_quality,
  stress_level,
  mood,
  pain_level,
  training_readiness,
  overall_mood,
  additional_notes
)
SELECT 
  p.id,
  CURRENT_DATE - (gs * INTERVAL '1 day'),
  (random() * 5 + 5)::integer,
  6 + (random() * 4),
  (random() * 5 + 5)::integer,
  (random() * 5 + 1)::integer,
  (random() * 5 + 5)::integer,
  (random() * 5 + 5)::integer,
  (random() * 5 + 1)::integer,
  (random() * 5 + 5)::integer,
  (random() * 3)::integer,
  (random() * 5 + 5)::integer,
  CASE (random() * 3)::integer
    WHEN 0 THEN 'excellent'
    WHEN 1 THEN 'good'
    ELSE 'fair'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Feeling great today!'
    WHEN random() < 0.6 THEN 'Some minor soreness'
    ELSE NULL
  END
FROM players p
CROSS JOIN generate_series(1, 14) gs;

-- Shot tracking data using existing session IDs
INSERT INTO shots (
  player_id,
  session_id,
  shot_number,
  court_x_position,
  court_y_position,
  made,
  arc_degrees,
  depth_inches,
  lr_deviation_inches,
  shot_type,
  created_at
)
SELECT 
  ss.player_id,
  ss.id,
  shot_num,
  (random() * 800)::numeric,
  (random() * 600)::numeric,
  random() > 0.35,
  (35 + random() * 20)::numeric,
  (8 + random() * 8)::numeric,
  (-3 + random() * 6)::numeric,
  'practice',
  ss.created_at + (shot_num * INTERVAL '30 seconds')
FROM shot_sessions ss
CROSS JOIN generate_series(1, 10) shot_num;

-- Realistic analytics events for activity tracking
INSERT INTO analytics_events (
  user_id,
  event_type,
  event_data,
  created_at
)
SELECT 
  p.id,
  CASE (random() * 5)::integer
    WHEN 0 THEN 'login'
    WHEN 1 THEN 'page_view'
    WHEN 2 THEN 'shot_tracking'
    WHEN 3 THEN 'health_checkin'
    ELSE 'data_access'
  END,
  jsonb_build_object(
    'timestamp', NOW() - (random() * INTERVAL '7 days'),
    'source', 'mobile_app',
    'session_id', gen_random_uuid()
  ),
  NOW() - (random() * INTERVAL '7 days')
FROM profiles p
CROSS JOIN generate_series(1, 50)
WHERE p.approval_status = 'approved';

-- Update player statistics based on shot data
UPDATE players 
SET 
  total_shots = shot_stats.total_shots,
  total_makes = shot_stats.total_makes,
  shooting_percentage = shot_stats.shooting_percentage,
  avg_arc_degrees = shot_stats.avg_arc_degrees,
  avg_depth_inches = shot_stats.avg_depth_inches,
  total_sessions = shot_stats.total_sessions,
  last_session_date = shot_stats.last_session_date,
  updated_at = NOW()
FROM (
  SELECT 
    player_id,
    COUNT(*) as total_shots,
    COUNT(*) FILTER (WHERE made = true) as total_makes,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE made = true)::numeric * 100.0) / COUNT(*)::numeric
      ELSE 0 
    END as shooting_percentage,
    AVG(arc_degrees) as avg_arc_degrees,
    AVG(depth_inches) as avg_depth_inches,
    COUNT(DISTINCT session_id) as total_sessions,
    MAX(created_at) as last_session_date
  FROM shots 
  GROUP BY player_id
) shot_stats
WHERE players.id = shot_stats.player_id;