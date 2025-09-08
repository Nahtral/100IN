-- Fix the handle_new_player_role function to handle missing constraint
-- First add the unique constraint if it doesn't exist
DO $$ 
BEGIN
    -- Check if constraint exists and add it if not
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'players' 
        AND constraint_name = 'players_user_id_unique'
    ) THEN
        ALTER TABLE public.players 
        ADD CONSTRAINT players_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Now update the function to handle the constraint properly
CREATE OR REPLACE FUNCTION public.handle_new_player_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create player record if user doesn't already have one
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.players (user_id, is_active, created_at, updated_at, total_shots, total_makes, shooting_percentage, avg_arc_degrees, avg_depth_inches, total_sessions)
    VALUES (NEW.user_id, true, now(), now(), 0, 0, 0.00, 0.00, 0.00, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now safely activate the player roles for approved users
UPDATE public.user_roles 
SET is_active = true
WHERE role = 'player' 
AND is_active = false 
AND user_id IN (
  SELECT id FROM public.profiles 
  WHERE approval_status = 'approved'
);