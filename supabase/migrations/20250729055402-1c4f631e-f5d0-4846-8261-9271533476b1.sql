-- Insert player records for all users with 'player' role
INSERT INTO public.players (user_id, is_active, created_at, updated_at)
SELECT DISTINCT ur.user_id, true, now(), now()
FROM public.user_roles ur
WHERE ur.role = 'player' 
  AND ur.is_active = true
  AND ur.user_id NOT IN (SELECT user_id FROM public.players);

-- Optional: Create a function to automatically add new players when user gets player role
CREATE OR REPLACE FUNCTION public.handle_new_player_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If a user is assigned the 'player' role and is active, create a player record
  IF NEW.role = 'player' AND NEW.is_active = true THEN
    INSERT INTO public.players (user_id, is_active, created_at, updated_at)
    VALUES (NEW.user_id, true, now(), now())
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create player records when user_role is inserted/updated
CREATE TRIGGER on_player_role_assigned
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_player_role();