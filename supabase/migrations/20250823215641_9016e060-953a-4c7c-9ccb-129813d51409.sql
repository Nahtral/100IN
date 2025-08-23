-- Add missing foreign key relationship from players to profiles
ALTER TABLE public.players 
ADD CONSTRAINT players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;