-- Add missing columns to user_roles table for approval tracking
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create role change audit table for tracking role assignments and revocations
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  old_role user_role,
  new_role text,
  changed_by uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on role_change_audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for role_change_audit table
CREATE POLICY "Super admins can view all role change audits"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert role change audits"
ON public.role_change_audit
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Update user_roles RLS policies to allow super admins to manage approvals
CREATE POLICY "Super admins can approve roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add index for better performance on role change audit queries
CREATE INDEX IF NOT EXISTS idx_role_change_audit_user_id ON public.role_change_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_created_at ON public.role_change_audit(created_at DESC);

-- Update user_roles table to add index on approval fields
CREATE INDEX IF NOT EXISTS idx_user_roles_approved_at ON public.user_roles(approved_at DESC) WHERE approved_at IS NOT NULL;

-- Create function to get user's requested role during registration
CREATE OR REPLACE FUNCTION public.get_user_requested_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = user_uuid 
    AND is_active = false 
  ORDER BY created_at DESC 
  LIMIT 1;
$$;

-- Update handle_new_user function to store requested role properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Assign the selected role (pending approval - set to inactive)
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
    'New user ' || COALESCE(new.raw_user_meta_data ->> 'full_name', new.email) || ' has registered requesting role: ' || user_role_to_assign || '. Please review and approve.',
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

-- Create updated trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger to update updated_at on role_change_audit
CREATE TRIGGER update_role_change_audit_updated_at
  BEFORE UPDATE ON public.role_change_audit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();