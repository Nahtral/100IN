-- Insert sample news updates
INSERT INTO public.news_updates (title, content, category, priority, author_id, published_at) VALUES
('Welcome to the New Season!', 'Panthers Basketball is excited to announce the start of our new season. We have great expectations for our talented team this year!', 'general', 'high', (SELECT id FROM profiles LIMIT 1), now()),
('Practice Schedule Update', 'Please note that practice times have been updated. Monday practices will now start at 6:00 PM instead of 5:30 PM.', 'schedule', 'normal', (SELECT id FROM profiles LIMIT 1), now() - interval '1 day'),
('Equipment Distribution', 'New team uniforms and equipment will be distributed this Friday after practice. Please bring your equipment bags.', 'equipment', 'normal', (SELECT id FROM profiles LIMIT 1), now() - interval '2 days');

-- Insert sample schedules
INSERT INTO public.schedules (title, description, event_type, start_time, end_time, location, opponent, created_by) VALUES
('Home Game vs Eagles', 'Important home game against the Eagles', 'game', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', 'Panthers Arena', 'Eagles', (SELECT id FROM profiles LIMIT 1)),
('Away Game vs Hawks', 'Away game at Hawks Arena', 'game', now() + interval '1 week', now() + interval '1 week' + interval '2 hours', 'Hawks Arena', 'Hawks', (SELECT id FROM profiles LIMIT 1)),
('Team Practice', 'Regular team practice session', 'practice', now() + interval '1 day', now() + interval '1 day' + interval '2 hours', 'Panthers Training Center', NULL, (SELECT id FROM profiles LIMIT 1)),
('Scrimmage Game', 'Practice scrimmage with local team', 'scrimmage', now() + interval '5 days', now() + interval '5 days' + interval '1.5 hours', 'Panthers Arena', 'Local Team', (SELECT id FROM profiles LIMIT 1));

-- Insert sample player performance data (only if there are players)
DO $$
DECLARE
    player_record RECORD;
BEGIN
    FOR player_record IN (SELECT id FROM players LIMIT 3) LOOP
        INSERT INTO public.player_performance (
            player_id, game_date, opponent, points, assists, rebounds, steals, blocks, 
            field_goals_made, field_goals_attempted, free_throws_made, free_throws_attempted, minutes_played
        ) VALUES
        (player_record.id, current_date - interval '3 days', 'Warriors', 
         15 + (random() * 20)::int, 3 + (random() * 8)::int, 5 + (random() * 10)::int, 
         1 + (random() * 4)::int, 0 + (random() * 3)::int, 
         6 + (random() * 8)::int, 12 + (random() * 8)::int, 2 + (random() * 6)::int, 4 + (random() * 4)::int, 
         25 + (random() * 15)::int),
        (player_record.id, current_date - interval '1 week', 'Tigers', 
         12 + (random() * 18)::int, 2 + (random() * 7)::int, 4 + (random() * 9)::int, 
         0 + (random() * 3)::int, 1 + (random() * 2)::int, 
         5 + (random() * 7)::int, 11 + (random() * 7)::int, 1 + (random() * 5)::int, 3 + (random() * 3)::int, 
         22 + (random() * 13)::int);
    END LOOP;
END $$;