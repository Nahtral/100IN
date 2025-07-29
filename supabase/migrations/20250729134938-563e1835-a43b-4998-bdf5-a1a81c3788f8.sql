-- Create chat system tables
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('group', 'private')),
  team_id UUID REFERENCES public.teams(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'link', 'location')),
  media_url TEXT,
  media_type TEXT,
  media_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in"
ON public.chats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can create group chats"
ON public.chats FOR INSERT
WITH CHECK (
  (chat_type = 'group' AND is_super_admin(auth.uid())) OR
  (chat_type = 'private' AND auth.uid() = created_by)
);

CREATE POLICY "Chat creators and super admins can update chats"
ON public.chats FOR UPDATE
USING (
  auth.uid() = created_by OR is_super_admin(auth.uid())
);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their chats"
ON public.chat_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp2
    WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Chat admins and super admins can manage participants"
ON public.chat_participants FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id 
    AND cp.user_id = auth.uid() 
    AND cp.role = 'admin'
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Chat participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
  ) AND auth.uid() = sender_id
);

CREATE POLICY "Message senders can update their messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Message senders and chat admins can delete messages"
ON public.messages FOR DELETE
USING (
  auth.uid() = sender_id OR
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = messages.chat_id 
    AND cp.user_id = auth.uid() 
    AND cp.role = 'admin'
  )
);

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in their chats"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own reactions"
ON public.message_reactions FOR ALL
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_chats_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat media
CREATE POLICY "Chat participants can view media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.media_url LIKE '%' || name AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid() IS NOT NULL
);