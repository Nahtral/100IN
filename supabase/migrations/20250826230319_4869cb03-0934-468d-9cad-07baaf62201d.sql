-- Add name field to players table for direct name storage
ALTER TABLE public.players 
ADD COLUMN name TEXT;