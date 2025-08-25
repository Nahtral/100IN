-- Fix all remaining security definer functions to have proper search_path

-- Fix check_auth_rate_limit function
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Fix handle_new_player_role function  
CREATE OR REPLACE FUNCTION public.handle_new_player_role()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Fix log_employee_data_access function
CREATE OR REPLACE FUNCTION public.log_employee_data_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to employee data when accessed by someone other than the employee
  IF auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    INSERT INTO public.analytics_events (
      user_id,
      event_type,
      event_data,
      created_at
    )
    VALUES (
      auth.uid(),
      'employee_data_access',
      jsonb_build_object(
        'accessed_employee_id', COALESCE(NEW.id, OLD.id),
        'operation', TG_OP,
        'accessed_employee_email', COALESCE(NEW.email, OLD.email),
        'contains_salary_data', (COALESCE(NEW.salary, OLD.salary) IS NOT NULL OR COALESCE(NEW.hourly_rate, OLD.hourly_rate) IS NOT NULL),
        'justification', 'hr_administrative_access'
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix log_medical_access function
CREATE OR REPLACE FUNCTION public.log_medical_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
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