-- Fix remaining security definer functions to have proper search_path

-- Fix log_profile_access function
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log when someone other than the profile owner accesses the data
  IF auth.uid() != COALESCE(NEW.id, OLD.id) THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    )
    VALUES (
      auth.uid(),
      'profile_access',
      jsonb_build_object(
        'accessed_profile_id', COALESCE(NEW.id, OLD.id),
        'operation', TG_OP,
        'accessed_email', COALESCE(NEW.email, OLD.email),
        'justification', 'administrative_access'
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix log_sensitive_operation function
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log sensitive data access to analytics_events table
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    auth.uid(),
    'sensitive_data_access',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'timestamp', now(),
      'user_role', (
        SELECT string_agg(ur.role::text, ',') 
        FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.is_active = true
      )
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix update_player_session_stats function
CREATE OR REPLACE FUNCTION public.update_player_session_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix update_player_shooting_stats function
CREATE OR REPLACE FUNCTION public.update_player_shooting_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
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