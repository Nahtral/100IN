-- Insert sample shot data with shot numbers
DO $$
DECLARE
    sample_player_id uuid;
    sample_session_id uuid;
    sample_user_id uuid;
    current_shot_number int := 1;
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

    -- Insert sample shots with shot numbers
    
    -- Corner 3 Left: 39/89 (43.82%)
    INSERT INTO shots (player_id, session_id, shot_number, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        generate_series,
        70 + (random() * 50)::int,
        460 + (random() * 60)::int,
        CASE WHEN generate_series <= 39 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(current_shot_number, current_shot_number + 88);
    current_shot_number := current_shot_number + 89;

    -- Mid-range Left Wing: 0/2 (0.00%)
    INSERT INTO shots (player_id, session_id, shot_number, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        generate_series,
        140 + (random() * 60)::int,
        300 + (random() * 100)::int,
        false,
        '2PT',
        now() - (random() * interval '30 days')
    FROM generate_series(current_shot_number, current_shot_number + 1);
    current_shot_number := current_shot_number + 2;

    -- Above Break 3: 14/33 (42.42%)
    INSERT INTO shots (player_id, session_id, shot_number, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        generate_series,
        300 + (random() * 200)::int,
        150 + (random() * 80)::int,
        CASE WHEN (generate_series - current_shot_number + 1) <= 14 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(current_shot_number, current_shot_number + 32);
    current_shot_number := current_shot_number + 33;

    -- Corner 3 Right: 49/102 (48.04%)
    INSERT INTO shots (player_id, session_id, shot_number, court_x_position, court_y_position, made, shot_type, created_at)
    SELECT 
        sample_player_id,
        sample_session_id,
        generate_series,
        680 + (random() * 50)::int,
        460 + (random() * 60)::int,
        CASE WHEN (generate_series - current_shot_number + 1) <= 49 THEN true ELSE false END,
        '3PT',
        now() - (random() * interval '30 days')
    FROM generate_series(current_shot_number, current_shot_number + 101);
    current_shot_number := current_shot_number + 102;

    -- Other regions with smaller samples
    INSERT INTO shots (player_id, session_id, shot_number, court_x_position, court_y_position, made, shot_type, created_at)
    VALUES 
        -- Wing 3 Right: 1/5 (20.00%)
        (sample_player_id, sample_session_id, current_shot_number, 620, 250, true, '3PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 1, 630, 260, false, '3PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 2, 640, 270, false, '3PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 3, 650, 280, false, '3PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 4, 660, 290, false, '3PT', now()),
        
        -- Paint Center: 1/3 (33.33%)
        (sample_player_id, sample_session_id, current_shot_number + 5, 380, 460, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 6, 390, 470, false, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 7, 400, 480, false, '2PT', now()),
        
        -- Mid-Range Top: 6/11 (54.55%)
        (sample_player_id, sample_session_id, current_shot_number + 8, 350, 280, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 9, 360, 290, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 10, 370, 300, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 11, 380, 280, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 12, 390, 290, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 13, 400, 300, true, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 14, 410, 280, false, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 15, 420, 290, false, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 16, 430, 300, false, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 17, 440, 280, false, '2PT', now()),
        (sample_player_id, sample_session_id, current_shot_number + 18, 450, 290, false, '2PT', now());

END $$;