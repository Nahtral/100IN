-- Add active status to players table
ALTER TABLE public.players 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;