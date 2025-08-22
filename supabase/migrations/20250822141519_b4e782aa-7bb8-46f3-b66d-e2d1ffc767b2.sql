-- Fix security warnings: Function Search Path Mutable
-- Update functions to have secure search_path settings

-- Fix log_sensitive_operation function
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix check_auth_rate_limit function
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log authentication attempts for monitoring
  INSERT INTO public.analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    NEW.id,
    'auth_attempt',
    jsonb_build_object(
      'email', NEW.email,
      'timestamp', now(),
      'ip_address', current_setting('request.headers')::json->>'x-real-ip'
    ),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';