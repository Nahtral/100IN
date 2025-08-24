-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  description TEXT,
  chat_type TEXT NOT NULL DEFAULT 'group',
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  reply_to_id UUID,
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats
CREATE POLICY "Users can view chats they participate in" ON public.chats
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chats.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat creators can update their chats" ON public.chats
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Super admins can manage all chats" ON public.chats
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their chats" ON public.messages
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE 
USING (auth.uid() = sender_id);

CREATE POLICY "Super admins can manage all messages" ON public.messages
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Create function to check if user created a chat
CREATE OR REPLACE FUNCTION user_created_chat(chat_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chats 
    WHERE id = chat_id AND created_by = user_id
  );
$$;

-- Create trigger for updating chats updated_at
CREATE OR REPLACE FUNCTION update_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION update_chats_updated_at();

-- Create trigger for updating messages updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();