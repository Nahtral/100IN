-- Insert sample shot data to demonstrate heatmap functionality
-- Use existing records and insert sample shots

DO $$
DECLARE
    sample_player_id uuid;
    sample_session_id uuid;
    sample_user_id uuid;
BEGIN
    -- Get first available user and player
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- Try to get existing player, or create basic player record
    SELECT id INTO sample_player_id FROM players LIMIT 1;
    
    -- If no player exists, create one with minimal required fields
    IF sample_player_id IS NULL THEN
        INSERT INTO players (user_id, is_active) 
        VALUES (sample_user_id, true)
        RETURNING id INTO sample_player_id;
    END IF;
    
    -- Create a sample session
    INSERT INTO shot_sessions (id, player_id, super_admin_id, session_name, location)
    VALUES (
        gen_random_uuid(),
        sample_player_id,
        sample_user_id,
        'Sample Training Session',
        'Practice Court'
    ) RETURNING id INTO sample_session_id;

    -- Insert sample shots matching the reference image regions and percentages
    
    -- Corner 3 Left: 39/89 (43.82%) - Green zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        70 + (random() * 50)::int, -- Left corner 3 area
        460 + (random() * 60)::int,
        CASE WHEN generate_series <= 39 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 89);

    -- Mid-range Left Wing: 0/2 (0.00%) - Red zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        140 + (random() * 60)::int, -- Left wing mid-range
        300 + (random() * 100)::int,
        false, -- All misses
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 2);

    -- Above Break 3: 14/33 (42.42%) - Orange zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        300 + (random() * 200)::int, -- Above break 3 area
        150 + (random() * 80)::int,
        CASE WHEN generate_series <= 14 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 33);

    -- Right Wing Mid-range: 0/2 (0.00%) - Red zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        580 + (random() * 60)::int, -- Right wing mid-range
        300 + (random() * 100)::int,
        false, -- All misses
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 2);

    -- Corner 3 Right: 49/102 (48.04%) - Green zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        680 + (random() * 50)::int, -- Right corner 3 area
        460 + (random() * 60)::int,
        CASE WHEN generate_series <= 49 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 102);

    -- Wing 3 Right: 1/5 (20.00%) - Red zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        620 + (random() * 60)::int, -- Right wing 3
        240 + (random() * 60)::int,
        CASE WHEN generate_series <= 1 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 5);

    -- Paint Center: 1/3 (33.33%) - Red zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        370 + (random() * 60)::int, -- Paint center
        450 + (random() * 70)::int,
        CASE WHEN generate_series <= 1 THEN true ELSE false END,
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 3);

    -- Wing 3 Left: 18/41 (43.90%) - Green zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        120 + (random() * 60)::int, -- Left wing 3
        240 + (random() * 60)::int,
        CASE WHEN generate_series <= 18 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 41);

    -- Mid-Range Top: 6/11 (54.55%) - Yellow zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        300 + (random() * 200)::int, -- Top of key mid-range
        260 + (random() * 40)::int,
        CASE WHEN generate_series <= 6 THEN true ELSE false END,
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 11);

    -- Deep 3 Right: 24/72 (33.33%) - Yellow zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        620 + (random() * 80)::int, -- Deep right 3
        80 + (random() * 100)::int,
        CASE WHEN generate_series <= 24 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 72);

    -- Restricted Area: 0/1 (0.00%) - Red zone
    INSERT INTO shots (player_id, session_id, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        390 + (random() * 20)::int, -- Near basket
        510 + (random() * 15)::int,
        false, -- Miss
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(1, 1);

END $$;