-- Fix security warnings: Set proper search_path for functions to prevent search path manipulation

-- Fix the log_player_data_access function
CREATE OR REPLACE FUNCTION public.log_player_data_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log when someone other than the player themselves accesses the data
  IF auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    )
    VALUES (
      auth.uid(),
      'player_data_access',
      jsonb_build_object(
        'accessed_player_id', COALESCE(NEW.id, OLD.id),
        'accessed_player_user_id', COALESCE(NEW.user_id, OLD.user_id),
        'operation', TG_OP,
        'contains_medical_notes', (COALESCE(NEW.medical_notes, OLD.medical_notes) IS NOT NULL AND COALESCE(NEW.medical_notes, OLD.medical_notes) != ''),
        'contains_emergency_contact', (COALESCE(NEW.emergency_contact_name, OLD.emergency_contact_name) IS NOT NULL AND COALESCE(NEW.emergency_contact_name, OLD.emergency_contact_name) != ''),
        'justification', 'legitimate_access'
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;