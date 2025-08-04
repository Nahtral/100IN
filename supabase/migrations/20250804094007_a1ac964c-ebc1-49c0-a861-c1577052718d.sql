-- Fix security warning: Add search_path to functions
CREATE OR REPLACE FUNCTION update_player_shooting_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update player stats when a new shot is added
  IF TG_OP = 'INSERT' THEN
    UPDATE public.players
    SET 
      total_shots = COALESCE(total_shots, 0) + 1,
      total_makes = COALESCE(total_makes, 0) + CASE WHEN NEW.made THEN 1 ELSE 0 END,
      shooting_percentage = CASE 
        WHEN COALESCE(total_shots, 0) + 1 > 0 THEN 
          ((COALESCE(total_makes, 0) + CASE WHEN NEW.made THEN 1 ELSE 0 END) * 100.0) / (COALESCE(total_shots, 0) + 1)
        ELSE 0 
      END,
      avg_arc_degrees = (
        SELECT AVG(arc_degrees) 
        FROM public.shots 
        WHERE player_id = NEW.player_id
      ),
      avg_depth_inches = (
        SELECT AVG(depth_inches) 
        FROM public.shots 
        WHERE player_id = NEW.player_id
      ),
      updated_at = NOW()
    WHERE id = NEW.player_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION update_player_session_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update session count and last session date when session ends
  IF TG_OP = 'UPDATE' AND OLD.total_shots IS NULL AND NEW.total_shots IS NOT NULL THEN
    UPDATE public.players
    SET 
      total_sessions = COALESCE(total_sessions, 0) + 1,
      last_session_date = NEW.updated_at,
      updated_at = NOW()
    WHERE id = NEW.player_id;
  END IF;
  
  RETURN NEW;
END;
$$;