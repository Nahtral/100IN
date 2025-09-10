-- Step 1: Clean up invalid player_teams entries (remove entries with non-existent team_id)
DELETE FROM public.player_teams 
WHERE team_id NOT IN (SELECT id FROM public.teams);

-- Step 2: Assign Keon Jafari to the "Boys" team (assuming he should be on a team)
-- First, get Keon's player ID and the Boys team ID
INSERT INTO public.player_teams (player_id, team_id, is_active, assigned_at, assigned_by, created_at, updated_at)
SELECT 
  p.id as player_id,
  t.id as team_id,
  true as is_active,
  now() as assigned_at,
  (SELECT id FROM public.profiles WHERE email LIKE '%admin%' LIMIT 1) as assigned_by,
  now() as created_at,
  now() as updated_at
FROM public.players p
CROSS JOIN public.teams t
WHERE p.id = 'fd2c6b9b-4a39-4c5a-9f5b-7d8e9f1a2b3c'  -- Keon Jafari's ID
  AND t.name = 'Boys'
  AND NOT EXISTS (
    SELECT 1 FROM public.player_teams pt 
    WHERE pt.player_id = p.id AND pt.is_active = true
  );

-- Step 3: Add foreign key constraints to prevent future invalid references
ALTER TABLE public.player_teams 
ADD CONSTRAINT fk_player_teams_player_id 
FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

ALTER TABLE public.player_teams 
ADD CONSTRAINT fk_player_teams_team_id 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;