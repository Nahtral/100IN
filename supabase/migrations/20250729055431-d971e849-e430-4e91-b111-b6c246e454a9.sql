-- Fix security warning: Set search_path for the function
CREATE OR REPLACE FUNCTION public.handle_new_player_role()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If a user is assigned the 'player' role and is active, create a player record
  IF NEW.role = 'player' AND NEW.is_active = true THEN
    INSERT INTO public.players (user_id, is_active, created_at, updated_at)
    VALUES (NEW.user_id, true, now(), now())
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$;