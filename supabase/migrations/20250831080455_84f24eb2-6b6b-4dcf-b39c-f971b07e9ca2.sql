-- Update RLS policies to block unapproved users
-- Most restrictive policy: only approved users can access data

-- Create policy for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Approved users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid() AND approval_status = 'approved');

-- Super admins can view all profiles (for approval management)
CREATE POLICY "Super admins can view all profiles for approval management" 
ON public.profiles 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Super admins can update approval status
CREATE POLICY "Super admins can update approval status" 
ON public.profiles 
FOR UPDATE 
USING (is_super_admin(auth.uid()));

-- Create global approval check function for other tables
CREATE OR REPLACE FUNCTION public.user_is_approved()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND approval_status = 'approved'
  ) OR is_super_admin(auth.uid());
$$;

-- Update major table policies to require approval
-- User roles - only approved users can have roles
ALTER POLICY "Users can view their own permissions" ON public.user_roles 
USING (user_is_approved() AND (user_id = auth.uid() OR is_super_admin(auth.uid())));

-- Notifications - only approved users can receive notifications  
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Approved users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_is_approved() AND user_id = auth.uid());

-- Players table - only approved users
DROP POLICY IF EXISTS "Players can view their own data" ON public.players;
CREATE POLICY "Approved players can view their own data" 
ON public.players 
FOR SELECT 
USING (user_is_approved() AND user_id = auth.uid());