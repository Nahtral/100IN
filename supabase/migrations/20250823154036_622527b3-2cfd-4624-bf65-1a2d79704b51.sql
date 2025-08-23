-- Add message management features without duplicate constraints
-- Add archived status and recall functionality to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_recalled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recalled_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

-- Add soft delete and archive functionality to chats
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- Update RLS policies for enhanced message management
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.messages;
CREATE POLICY "Users can manage their own messages" 
ON public.messages 
FOR ALL 
USING (auth.uid() = sender_id OR is_super_admin(auth.uid()));

-- Update chat policies for archiving
DROP POLICY IF EXISTS "Chat creators can manage chats" ON public.chats;
CREATE POLICY "Chat creators can manage chats" 
ON public.chats 
FOR ALL 
USING (user_created_chat(id, auth.uid()) OR is_super_admin(auth.uid()));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON public.chat_participants(chat_id);