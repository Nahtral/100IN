-- Add foreign key relationship between players and profiles tables
-- First, ensure the user_id column in players table references the profiles table
ALTER TABLE public.players 
ADD CONSTRAINT fk_players_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;