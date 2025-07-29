-- Add foreign key constraint between players and profiles tables
ALTER TABLE public.players 
ADD CONSTRAINT players_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;