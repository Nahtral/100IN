-- Migrate player-team relationships from player_teams to team_members
-- This fixes the attendance modal fetch player logic by populating team_members table

INSERT INTO public.team_members (team_id, user_id, is_active, created_at, updated_at)
SELECT 
  pt.team_id,
  p.user_id,
  pt.is_active,
  pt.created_at,
  pt.updated_at
FROM public.player_teams pt
JOIN public.players p ON pt.player_id = p.id
WHERE pt.is_active = true
ON CONFLICT (team_id, user_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- Log the migration for audit purposes
INSERT INTO public.analytics_events (
  user_id, 
  event_type, 
  event_data, 
  created_at
) VALUES (
  auth.uid(), 
  'data_migration',
  jsonb_build_object(
    'migration_type', 'player_teams_to_team_members',
    'migrated_count', (
      SELECT COUNT(*) FROM public.player_teams pt
      JOIN public.players p ON pt.player_id = p.id
      WHERE pt.is_active = true
    ),
    'timestamp', now()
  ),
  now()
);