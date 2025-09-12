-- PHASE 1A: Fix CRITICAL chat_participants infinite recursion ONLY
-- This is the blocking issue causing database errors

-- Create security definer functions to prevent recursive RLS issues
CREATE OR REPLACE FUNCTION public.user_is_chat_participant(chat_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = chat_uuid AND user_id = user_uuid
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_is_chat_admin(chat_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = chat_uuid AND user_id = user_uuid AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = chat_uuid AND created_by = user_uuid
  );
$function$;

-- Drop ALL existing RLS policies on chat_participants that cause recursion
DROP POLICY IF EXISTS "Chat creators and admins can manage participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join chats they're invited to" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their chats" ON public.chat_participants;

-- Create new safe RLS policies using security definer functions (no recursion)
CREATE POLICY "Users can view participants in their chats safe"
ON public.chat_participants
FOR SELECT
USING (user_is_chat_participant(chat_id, auth.uid()));

CREATE POLICY "Chat admins can manage participants safe"
ON public.chat_participants
FOR ALL
USING (user_is_chat_admin(chat_id, auth.uid()));

CREATE POLICY "Users can join chats they're invited to safe"
ON public.chat_participants
FOR INSERT
WITH CHECK (user_id = auth.uid());