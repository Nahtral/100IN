-- Add shot analytics columns to players table
ALTER TABLE public.players 
ADD COLUMN total_shots INTEGER DEFAULT 0,
ADD COLUMN total_makes INTEGER DEFAULT 0,
ADD COLUMN shooting_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN avg_arc_degrees NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN avg_depth_inches NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN last_session_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_sessions INTEGER DEFAULT 0;

-- Create function to update player shooting stats
CREATE OR REPLACE FUNCTION update_player_shooting_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for shot stats updates
CREATE TRIGGER update_player_stats_on_shot
  AFTER INSERT ON public.shots
  FOR EACH ROW
  EXECUTE FUNCTION update_player_shooting_stats();

-- Create function to update session stats
CREATE OR REPLACE FUNCTION update_player_session_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for session stats updates
CREATE TRIGGER update_player_session_stats_trigger
  AFTER UPDATE ON public.shot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_player_session_stats();