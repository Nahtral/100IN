-- Secure profiles table access to prevent contact information harvesting
-- Remove overly broad super admin access and implement granular controls

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create granular access policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Only allow super admins and staff with explicit permission to view other profiles
CREATE POLICY "Authorized staff can view profiles for administrative purposes" 
ON public.profiles 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND 
   user_has_permission(auth.uid(), 'manage_users'))
);

-- Allow super admins and authorized staff to manage profiles
CREATE POLICY "Authorized staff can manage user profiles" 
ON public.profiles 
FOR ALL 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND 
   user_has_permission(auth.uid(), 'manage_users'))
);

-- Create specific permission for user profile management
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_users', 'Can view and manage user profiles and accounts', 'user_management')
ON CONFLICT (name) DO NOTHING;

-- Add audit logging for profile access to track who accesses contact information
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
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

-- Apply audit trigger to profiles table (for data modification tracking)
CREATE TRIGGER audit_profile_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_access();

-- Create a function to safely retrieve limited profile data
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(profile_id UUID)
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  access_level TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is authorized to see full contact info
  IF is_super_admin(auth.uid()) OR 
     user_has_permission(auth.uid(), 'manage_users') OR
     auth.uid() = profile_id THEN
    -- Return full access if authorized
    RETURN QUERY
    SELECT p.id, p.full_name, 'full_access'::TEXT
    FROM public.profiles p
    WHERE p.id = profile_id;
  ELSE
    -- Return masked info for general access (prevent contact harvesting)
    RETURN QUERY
    SELECT p.id, 
           CASE 
             WHEN LENGTH(p.full_name) > 0 THEN LEFT(p.full_name, 1) || '***'
             ELSE 'User'
           END,
           'limited_access'::TEXT
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
END;
$$;