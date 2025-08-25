-- Insert sample shot data to demonstrate heatmap functionality
-- First, let's create a sample player if one doesn't exist
INSERT INTO players (id, user_id, first_name, last_name, jersey_number, position, is_active, team_id) 
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1), -- Use existing user
  'Sample',
  'Player',
  23,
  'Guard',
  true,
  null
) ON CONFLICT (user_id) DO NOTHING;

-- Get the player ID for sample data
DO $$
DECLARE
    sample_player_id uuid;
    sample_session_id uuid;
BEGIN
    -- Get or create sample player
    SELECT id INTO sample_player_id FROM players WHERE first_name = 'Sample' AND last_name = 'Player' LIMIT 1;
    
    -- Create a sample session
    INSERT INTO shot_sessions (id, player_id, super_admin_id, session_name, location)
    VALUES (
        gen_random_uuid(),
        sample_player_id,
        (SELECT id FROM auth.users LIMIT 1),
        'Sample Training Session',
        'Practice Court'
    ) RETURNING id INTO sample_session_id;

    -- Insert sample shots matching the reference image regions and percentages
    
    -- Corner 3 Left: 39/89 (43.82%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        70 + (random() * 50), -- Left corner 3 area
        460 + (random() * 60),
        CASE WHEN generate_series <= 39 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 89);

    -- Mid-range Left Wing: 0/2 (0.00%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        140 + (random() * 60), -- Left wing mid-range
        300 + (random() * 100),
        false, -- All misses
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 2);

    -- Above Break 3: 14/33 (42.42%)  
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        300 + (random() * 200), -- Above break 3 area
        150 + (random() * 80),
        CASE WHEN generate_series <= 14 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 33);

    -- Right Wing Mid-range: 0/2 (0.00%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        580 + (random() * 60), -- Right wing mid-range
        300 + (random() * 100),
        false, -- All misses
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 2);

    -- Corner 3 Right: 49/102 (48.04%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        680 + (random() * 50), -- Right corner 3 area
        460 + (random() * 60),
        CASE WHEN generate_series <= 49 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 102);

    -- Wing 3 Right: 1/5 (20.00%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        620 + (random() * 60), -- Right wing 3
        240 + (random() * 60),
        CASE WHEN generate_series <= 1 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 5);

    -- Paint Center: 1/3 (33.33%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        370 + (random() * 60), -- Paint center
        450 + (random() * 70),
        CASE WHEN generate_series <= 1 THEN true ELSE false END,
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 3);

    -- Wing 3 Left: 18/41 (43.90%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        120 + (random() * 60), -- Left wing 3
        240 + (random() * 60),
        CASE WHEN generate_series <= 18 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 41);

    -- Mid-Range Top: 6/11 (54.55%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        300 + (random() * 200), -- Top of key mid-range
        260 + (random() * 40),
        CASE WHEN generate_series <= 6 THEN true ELSE false END,
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 11);

    -- Deep 3 Right: 24/72 (33.33%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        620 + (random() * 80), -- Deep right 3
        80 + (random() * 100),
        CASE WHEN generate_series <= 24 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 72);

    -- Restricted Area: 0/1 (0.00%)
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        390 + (random() * 20), -- Near basket
        510 + (random() * 15),
        false, -- Miss
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 1);

END $$;