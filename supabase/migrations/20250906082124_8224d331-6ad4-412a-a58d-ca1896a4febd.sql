-- Create database seeder for comprehensive data population
-- This will populate critical tables with realistic data for proper app functionality

-- First, let's insert some player performance data with correct column names
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
  CURRENT_DATE - (generate_series(1, 10) * INTERVAL '7 days'),
  CASE 
    WHEN random() < 0.25 THEN 'Thunder Hawks'
    WHEN random() < 0.5 THEN 'Lightning Bolts'
    WHEN random() < 0.75 THEN 'Fire Eagles'
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
CROSS JOIN generate_series(1, 10);

-- Insert health wellness data
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
  CURRENT_DATE - (generate_series(1, 30) * INTERVAL '1 day'),
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
CROSS JOIN generate_series(1, 30);

-- Insert daily health check-ins
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
  CURRENT_DATE - (generate_series(1, 14) * INTERVAL '1 day'),
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
  CASE 
    WHEN random() < 0.33 THEN 'excellent'
    WHEN random() < 0.66 THEN 'good'
    ELSE 'fair'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Feeling great today!'
    WHEN random() < 0.6 THEN 'Some minor soreness'
    ELSE NULL
  END
FROM players p
CROSS JOIN generate_series(1, 14);

-- Insert shot tracking data
INSERT INTO shots (
  player_id,
  session_id,
  shot_number,
  x_position,
  y_position,
  made,
  arc_degrees,
  depth_inches,
  lr_deviation_inches,
  shot_type,
  shot_region,
  video_url,
  created_at
)
SELECT 
  p.id,
  gen_random_uuid(),
  generate_series(1, 50),
  (random() * 800)::numeric,
  (random() * 600)::numeric,
  random() > 0.35,
  (35 + random() * 20)::numeric,
  (8 + random() * 8)::numeric,
  (-3 + random() * 6)::numeric,
  CASE 
    WHEN random() < 0.5 THEN 'practice'
    ELSE 'game'
  END,
  determine_shot_region((random() * 800)::numeric, (random() * 600)::numeric),
  NULL,
  NOW() - (random() * INTERVAL '30 days')
FROM players p
CROSS JOIN generate_series(1, 50);

-- Insert team attendance data
INSERT INTO team_attendance (
  team_id,
  schedule_id,
  total_players,
  present_count,
  absent_count,
  late_count,
  excused_count,
  attendance_percentage,
  updated_by
)
SELECT 
  t.id,
  s.id,
  (SELECT COUNT(*) FROM players WHERE team_id = t.id AND is_active = true),
  (random() * 5 + 10)::integer,
  (random() * 3)::integer,
  (random() * 2)::integer,
  (random() * 1)::integer,
  (70 + random() * 30)::numeric,
  (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1)
FROM teams t
CROSS JOIN schedules s
WHERE s.start_time >= CURRENT_DATE - INTERVAL '30 days';

-- Insert more realistic news updates
INSERT INTO news_updates (
  title,
  content,
  author_id,
  category,
  is_featured,
  is_published,
  published_at,
  tags,
  created_at
)
VALUES 
  ('Panthers Dominate Regional Championships', 
   'Our U18 team secured a decisive victory in the regional championships with outstanding performances from all players. The team''s dedication to training and tactical preparation showed throughout the match.',
   (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1),
   'team_news',
   true,
   true,
   NOW() - INTERVAL '2 days',
   ARRAY['championships', 'u18', 'victory'],
   NOW() - INTERVAL '2 days'),
   
  ('New Training Facilities Opening Soon',
   'We''re excited to announce the opening of our new state-of-the-art training facilities. The new complex will feature advanced shooting analysis technology and enhanced court surfaces.',
   (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1),
   'announcements',
   true,
   true,
   NOW() - INTERVAL '5 days',
   ARRAY['facilities', 'training', 'technology'],
   NOW() - INTERVAL '5 days'),
   
  ('Player Health and Wellness Workshop',
   'Join us for an important workshop on player health, nutrition, and injury prevention. Medical staff will be presenting the latest research on athlete wellness.',
   (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1),
   'health',
   false,
   true,
   NOW() - INTERVAL '1 week',
   ARRAY['health', 'workshop', 'nutrition'],
   NOW() - INTERVAL '1 week');

-- Insert realistic analytics events for activity tracking
INSERT INTO analytics_events (
  user_id,
  event_type,
  event_data,
  created_at
)
SELECT 
  p.id,
  CASE 
    WHEN random() < 0.2 THEN 'login'
    WHEN random() < 0.4 THEN 'page_view'
    WHEN random() < 0.6 THEN 'shot_tracking'
    WHEN random() < 0.8 THEN 'health_checkin'
    ELSE 'data_access'
  END,
  jsonb_build_object(
    'timestamp', NOW() - (random() * INTERVAL '7 days'),
    'source', 'mobile_app',
    'session_id', gen_random_uuid()
  ),
  NOW() - (random() * INTERVAL '7 days')
FROM profiles p
CROSS JOIN generate_series(1, 100)
WHERE p.approval_status = 'approved';

-- Update player statistics based on shot data
UPDATE players 
SET 
  total_shots = (SELECT COUNT(*) FROM shots WHERE player_id = players.id),
  total_makes = (SELECT COUNT(*) FROM shots WHERE player_id = players.id AND made = true),
  shooting_percentage = CASE 
    WHEN (SELECT COUNT(*) FROM shots WHERE player_id = players.id) > 0 THEN
      ((SELECT COUNT(*) FROM shots WHERE player_id = players.id AND made = true)::numeric * 100.0) / 
      (SELECT COUNT(*) FROM shots WHERE player_id = players.id)::numeric
    ELSE 0 
  END,
  avg_arc_degrees = (SELECT AVG(arc_degrees) FROM shots WHERE player_id = players.id),
  avg_depth_inches = (SELECT AVG(depth_inches) FROM shots WHERE player_id = players.id),
  total_sessions = (SELECT COUNT(DISTINCT session_id) FROM shots WHERE player_id = players.id AND session_id IS NOT NULL),
  last_session_date = (SELECT MAX(created_at) FROM shots WHERE player_id = players.id),
  updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM shots WHERE player_id = players.id);