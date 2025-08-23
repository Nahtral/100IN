-- Fix infinite recursion in chat_participants policies

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Chat creators can manage participants" ON chat_participants;

-- Create a security definer function to check if user created the chat
CREATE OR REPLACE FUNCTION public.user_created_chat(chat_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = chat_id AND created_by = user_id
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Chat creators can manage participants" 
ON chat_participants 
FOR ALL 
USING (public.user_created_chat(chat_id, auth.uid()));

-- Also ensure the chats table exists and has proper policies
-- Let's create the chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    type text NOT NULL DEFAULT 'private',
    created_by uuid NOT NULL,
    team_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on chats table
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create simple policies for chats table that don't reference chat_participants
CREATE POLICY "Authenticated users can view chats" 
ON public.chats 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage all chats" 
ON public.chats 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can create chats" 
ON public.chats 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);