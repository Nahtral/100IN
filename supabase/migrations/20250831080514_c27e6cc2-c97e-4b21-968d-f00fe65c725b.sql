-- Fix the RLS policy error by checking existing policies first
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

-- Update notifications policy to require approval  
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Approved users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_is_approved() AND user_id = auth.uid());

-- Update players policy to require approval
DROP POLICY IF EXISTS "Players can view their own data" ON public.players;
CREATE POLICY "Approved players can view their own data" 
ON public.players 
FOR SELECT 
USING (user_is_approved() AND user_id = auth.uid());

-- Update chats to require approval
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Approved users can view chats they participate in" 
ON public.chats 
FOR SELECT 
USING (user_is_approved() AND EXISTS (
  SELECT 1 FROM public.chat_participants 
  WHERE chat_id = chats.id AND user_id = auth.uid()
));