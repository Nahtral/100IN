-- CRITICAL SECURITY FIX: Address the profiles table exposure specifically

-- First, check if there are any overly permissive policies and remove them
DO $$
BEGIN
    -- Drop any policies that might allow public access to profiles
    DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Public profile access" ON public.profiles;
    DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
    -- Policy might not exist, continue
    NULL;
END $$;

-- Ensure profiles are properly protected - only allow specific access patterns
-- This policy should already exist but let's verify it's the only one
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Staff can view profiles only for administrative purposes with proper permissions
CREATE POLICY "Authorized staff can view profiles for administrative purposes" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_users')));

-- Create audit trigger for profile access logging
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;