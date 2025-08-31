-- Add approval status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN rejection_reason text;

-- Create index for faster approval status queries
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND approval_status = 'approved'
  );
$$;

-- Update existing users to be approved (so current users don't get locked out)
UPDATE public.profiles SET 
  approval_status = 'approved',
  approved_at = now(),
  approved_by = '320b002e-c5cb-4206-800d-a8296db59a47' -- Current super admin
WHERE approval_status = 'pending';

-- Create trigger to send approval notification
CREATE OR REPLACE FUNCTION public.notify_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create notification for super admins about new user registration
  INSERT INTO public.notifications (
    user_id,
    type_id,
    title,
    message,
    priority,
    related_entity_type,
    related_entity_id
  )
  SELECT 
    ur.user_id,
    (SELECT id FROM public.notification_types WHERE name = 'system' LIMIT 1),
    'New User Registration',
    'New user ' || NEW.full_name || ' (' || NEW.email || ') has registered and requires approval.',
    'high',
    'user_approval',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'super_admin' AND ur.is_active = true;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registrations
CREATE TRIGGER trigger_notify_approval_request
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.approval_status = 'pending')
  EXECUTE FUNCTION public.notify_approval_request();