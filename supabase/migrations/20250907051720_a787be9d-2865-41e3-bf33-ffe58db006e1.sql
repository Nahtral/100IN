-- Complete Chat System Schema
-- Drop existing chat tables to start fresh
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;  
DROP TABLE IF EXISTS chats CASCADE;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create chat tables with proper structure
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('private', 'group', 'team')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size BIGINT,
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_chats_created_by ON chats(created_by);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_messages_chat_id_created_at ON chat_messages(chat_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in"
ON chats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chats.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats"
ON chats FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Chat creators and admins can update chats"
ON chats FOR UPDATE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chats.id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their chats"
ON chat_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Chat creators and admins can manage participants"
ON chat_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chats 
    WHERE id = chat_participants.chat_id AND created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid() AND cp2.role = 'admin'
  )
);

CREATE POLICY "Users can join chats they're invited to"
ON chat_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chats"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chat_messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their chats"
ON chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chat_messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can edit their own messages"
ON chat_messages FOR UPDATE
USING (sender_id = auth.uid());

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in their chats"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own reactions"
ON message_reactions FOR ALL
USING (user_id = auth.uid());

-- Storage policies for chat attachments
CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update last_message_at on chats
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_last_message_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_last_message();

-- Enable realtime for chat tables
ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;  
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE message_reactions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE chats, chat_participants, chat_messages, message_reactions;