-- Phase 1: Database Schema Cleanup - Remove legacy team_id column and add constraints

-- Step 1: Remove the legacy team_id column from players table entirely
ALTER TABLE public.players DROP COLUMN IF EXISTS team_id;

-- Step 2: Add constraint to ensure data integrity for active player-team assignments
-- This prevents a player from being assigned to the same team multiple times while active
ALTER TABLE public.player_teams 
ADD CONSTRAINT IF NOT EXISTS unique_active_player_team 
EXCLUDE (player_id WITH =, team_id WITH =) 
WHERE (is_active = true);

-- Step 3: Add index for better performance on player-team queries
CREATE INDEX IF NOT EXISTS idx_player_teams_active ON public.player_teams (player_id, team_id) WHERE is_active = true;

-- Step 4: Add missing columns to teams table for better functionality
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;