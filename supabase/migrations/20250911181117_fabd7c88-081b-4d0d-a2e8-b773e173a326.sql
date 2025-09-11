-- Add client_msg_id for idempotent message sends
ALTER TABLE public.chat_messages 
ADD COLUMN client_msg_id text UNIQUE;

-- Add display_alias for per-user chat renaming
ALTER TABLE public.chat_participants 
ADD COLUMN display_alias text;

-- Add message version control for conflict resolution
ALTER TABLE public.chat_messages 
ADD COLUMN version integer DEFAULT 1;

-- Add indices for performance
CREATE INDEX idx_chat_messages_client_msg_id ON public.chat_messages(client_msg_id);
CREATE INDEX idx_chat_participants_display_alias ON public.chat_participants(chat_id, user_id) WHERE display_alias IS NOT NULL;

-- Create function to handle exact-once message delivery
CREATE OR REPLACE FUNCTION public.send_message_idempotent(
  p_chat_id uuid,
  p_sender_id uuid,
  p_content text,
  p_client_msg_id text,
  p_message_type text DEFAULT 'text',
  p_attachment_url text DEFAULT NULL,
  p_attachment_name text DEFAULT NULL,
  p_attachment_size bigint DEFAULT NULL,
  p_reply_to_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_msg_id uuid;
  new_message_id uuid;
  result jsonb;
BEGIN
  -- Check if message already exists (idempotency)
  SELECT id INTO existing_msg_id 
  FROM public.chat_messages 
  WHERE client_msg_id = p_client_msg_id;
  
  IF existing_msg_id IS NOT NULL THEN
    -- Return existing message
    SELECT jsonb_build_object(
      'id', id,
      'chat_id', chat_id,
      'sender_id', sender_id,
      'content', content,
      'message_type', message_type,
      'created_at', created_at,
      'status', status,
      'duplicate', true
    ) INTO result
    FROM public.chat_messages 
    WHERE id = existing_msg_id;
    
    RETURN result;
  END IF;

  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = p_chat_id AND user_id = p_sender_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;

  -- Insert new message
  INSERT INTO public.chat_messages (
    chat_id, sender_id, content, message_type, client_msg_id,
    attachment_url, attachment_name, attachment_size, reply_to_id, status
  ) VALUES (
    p_chat_id, p_sender_id, p_content, p_message_type, p_client_msg_id,
    p_attachment_url, p_attachment_name, p_attachment_size, p_reply_to_id, 'visible'
  ) RETURNING id INTO new_message_id;

  -- Update chat last_message_at
  UPDATE public.chats 
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_chat_id;

  -- Return new message with formatted data
  SELECT jsonb_build_object(
    'id', cm.id,
    'chat_id', cm.chat_id,
    'sender_id', cm.sender_id,
    'content', cm.content,
    'message_type', cm.message_type,
    'attachment_url', cm.attachment_url,
    'attachment_name', cm.attachment_name,
    'attachment_size', cm.attachment_size,
    'reply_to_id', cm.reply_to_id,
    'created_at', cm.created_at,
    'status', cm.status,
    'sender_name', COALESCE(p.full_name, p.email, 'Unknown'),
    'sender_email', p.email,
    'is_edited', false,
    'is_deleted', false,
    'duplicate', false
  ) INTO result
  FROM public.chat_messages cm
  LEFT JOIN public.profiles p ON cm.sender_id = p.id
  WHERE cm.id = new_message_id;

  RETURN result;
END;
$$;

-- Create function to handle message edits with version control
CREATE OR REPLACE FUNCTION public.edit_message_versioned(
  p_message_id uuid,
  p_user_id uuid,
  p_new_content text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_record RECORD;
  time_diff INTERVAL;
BEGIN
  -- Get message and verify ownership
  SELECT * INTO message_record 
  FROM public.chat_messages 
  WHERE id = p_message_id AND sender_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or not owned by user';
  END IF;

  time_diff := now() - message_record.created_at;

  -- Check edit window (15 minutes)
  IF time_diff > INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'Edit window expired (15 minutes limit)';
  END IF;
  
  IF p_new_content IS NULL OR trim(p_new_content) = '' THEN
    RAISE EXCEPTION 'New content cannot be empty';
  END IF;
  
  -- Update message with version increment
  UPDATE public.chat_messages 
  SET 
    content = p_new_content,
    edited_at = now(),
    updated_at = now(),
    version = version + 1
  WHERE id = p_message_id;
END;
$$;

-- Create function to handle message recalls with version control
CREATE OR REPLACE FUNCTION public.recall_message_versioned(
  p_message_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_record RECORD;
  time_diff INTERVAL;
BEGIN
  -- Get message and verify ownership
  SELECT * INTO message_record 
  FROM public.chat_messages 
  WHERE id = p_message_id AND sender_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or not owned by user';
  END IF;

  time_diff := now() - message_record.created_at;

  -- Check recall window (2 minutes)
  IF time_diff > INTERVAL '2 minutes' THEN
    RAISE EXCEPTION 'Recall window expired (2 minutes limit)';
  END IF;
  
  -- Update message status
  UPDATE public.chat_messages 
  SET 
    status = 'recalled',
    content = '[Message recalled]',
    updated_at = now(),
    version = version + 1
  WHERE id = p_message_id;
END;
$$;

-- Enable realtime for message updates and deletes
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;