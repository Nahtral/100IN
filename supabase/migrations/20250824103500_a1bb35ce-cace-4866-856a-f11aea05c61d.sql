-- Fix security warnings - Function Search Path Mutable
-- Update the functions to have proper search_path settings

-- Fix mask_sensitive_email function
CREATE OR REPLACE FUNCTION public.mask_sensitive_email(email_input TEXT)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  -- Only mask for non-super admins and non-staff
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RETURN LEFT(email_input, 3) || '***@' || SPLIT_PART(email_input, '@', 2);
  END IF;
  RETURN email_input;
END;
$$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent auth attempts from same IP/user
  SELECT COUNT(*) INTO attempt_count
  FROM public.analytics_events
  WHERE event_type = 'auth_attempt'
    AND created_at > NOW() - INTERVAL '15 minutes'
    AND (
      event_data->>'ip_address' = current_setting('request.headers')::json->>'x-real-ip'
      OR user_id = NEW.id
    );
  
  -- If too many attempts, log security event
  IF attempt_count > 10 THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    ) VALUES (
      NEW.id,
      'security_alert',
      jsonb_build_object(
        'alert_type', 'rate_limit_exceeded',
        'attempt_count', attempt_count,
        'ip_address', current_setting('request.headers')::json->>'x-real-ip'
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;