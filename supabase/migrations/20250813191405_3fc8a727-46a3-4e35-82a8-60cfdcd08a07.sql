-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.log_medical_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log access to medical data for compliance
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  )
  VALUES (
    auth.uid(),
    'medical_data_access',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'record_id', COALESCE(NEW.id, OLD.id),
      'operation', TG_OP,
      'patient_id', COALESCE(NEW.player_id, OLD.player_id)
    ),
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;