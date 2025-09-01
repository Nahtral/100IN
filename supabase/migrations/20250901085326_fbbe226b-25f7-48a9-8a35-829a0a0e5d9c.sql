-- Update the handle_new_user function to process the preferred role from registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  user_role_to_assign text;
BEGIN
  -- Insert profile first
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone'
  );
  
  -- Get the preferred role from signup metadata
  user_role_to_assign := COALESCE(new.raw_user_meta_data ->> 'preferred_role', 'player');
  
  -- Validate that it's a valid role enum value
  IF user_role_to_assign NOT IN ('super_admin', 'staff', 'coach', 'player', 'parent', 'medical', 'partner') THEN
    user_role_to_assign := 'player'; -- Default fallback
  END IF;
  
  -- Assign the selected role (pending approval)
  INSERT INTO public.user_roles (user_id, role, is_active, created_at)
  VALUES (new.id, user_role_to_assign::user_role, false, now());
  
  -- Create a notification for super admins about new user registration
  INSERT INTO public.notifications (
    user_id,
    type_id,
    title,
    message,
    priority,
    related_entity_type,
    related_entity_id,
    data
  )
  SELECT 
    ur.user_id,
    (SELECT id FROM public.notification_types WHERE name = 'user_registration' LIMIT 1),
    'New User Registration',
    'New user ' || COALESCE(new.raw_user_meta_data ->> 'full_name', new.email) || ' has registered with role: ' || user_role_to_assign || '. Please review and approve.',
    'high',
    'user_approval',
    new.id,
    jsonb_build_object(
      'user_email', new.email,
      'requested_role', user_role_to_assign,
      'full_name', new.raw_user_meta_data ->> 'full_name'
    )
  FROM public.user_roles ur
  WHERE ur.role = 'super_admin' AND ur.is_active = true;
  
  RETURN new;
END;
$$;

-- Create notification type for user registration if it doesn't exist
INSERT INTO public.notification_types (name, description, category, icon)
VALUES ('user_registration', 'New user registration notifications', 'system', 'UserPlus')
ON CONFLICT (name) DO NOTHING;