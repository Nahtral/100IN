-- Drop existing functions and recreate with proper signatures
DROP FUNCTION IF EXISTS public.send_message_idempotent(uuid,uuid,text,text,text,text,text,bigint,uuid);
DROP FUNCTION IF EXISTS public.edit_message_versioned(uuid,uuid,text);
DROP FUNCTION IF EXISTS public.recall_message_versioned(uuid,uuid);

-- 1. Idempotent message sending function
CREATE OR REPLACE FUNCTION public.send_message_idempotent(
  p_chat_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_client_msg_id TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_attachment_url TEXT DEFAULT NULL,
  p_attachment_name TEXT DEFAULT NULL,
  p_attachment_size BIGINT DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_message_id UUID;
  new_message_id UUID;
BEGIN
  -- Check if message with client_msg_id already exists
  SELECT id INTO existing_message_id
  FROM public.chat_messages
  WHERE client_msg_id = p_client_msg_id AND sender_id = p_sender_id;
  
  IF existing_message_id IS NOT NULL THEN
    RETURN existing_message_id; -- Return existing message ID (idempotent)
  END IF;
  
  -- Verify sender is participant in chat
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = p_chat_id AND user_id = p_sender_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;
  
  -- Insert new message
  INSERT INTO public.chat_messages (
    chat_id, sender_id, content, message_type, attachment_url,
    attachment_name, attachment_size, reply_to_id, client_msg_id,
    created_at, status
  ) VALUES (
    p_chat_id, p_sender_id, p_content, p_message_type, p_attachment_url,
    p_attachment_name, p_attachment_size, p_reply_to_id, p_client_msg_id,
    now(), 'visible'
  ) RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- 2. Versioned message editing function
CREATE OR REPLACE FUNCTION public.edit_message_versioned(
  p_message_id UUID,
  p_user_id UUID,
  p_new_content TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_record RECORD;
  time_diff INTERVAL;
BEGIN
  -- Get message and verify ownership
  SELECT * INTO message_record
  FROM public.chat_messages
  WHERE id = p_message_id AND sender_id = p_user_id AND status = 'visible';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or not owned by user';
  END IF;
  
  -- Check time window (15 minutes)
  time_diff := now() - message_record.created_at;
  IF time_diff > INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'Edit window expired (15 minutes limit)';
  END IF;
  
  -- Validate content
  IF p_new_content IS NULL OR trim(p_new_content) = '' THEN
    RAISE EXCEPTION 'New content cannot be empty';
  END IF;
  
  -- Update message
  UPDATE public.chat_messages
  SET 
    content = p_new_content,
    edited_at = now(),
    updated_at = now(),
    version = COALESCE(version, 1) + 1
  WHERE id = p_message_id;
END;
$$;

-- 3. Versioned message recall function
CREATE OR REPLACE FUNCTION public.recall_message_versioned(
  p_message_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  message_record RECORD;
  time_diff INTERVAL;
BEGIN
  -- Get message and verify ownership
  SELECT * INTO message_record
  FROM public.chat_messages
  WHERE id = p_message_id AND sender_id = p_user_id AND status = 'visible';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or not owned by user';
  END IF;
  
  -- Check time window (2 minutes for recall)
  time_diff := now() - message_record.created_at;
  IF time_diff > INTERVAL '2 minutes' THEN
    RAISE EXCEPTION 'Recall window expired (2 minutes limit)';
  END IF;
  
  -- Update message status
  UPDATE public.chat_messages
  SET 
    status = 'recalled',
    content = '[Message recalled]',
    updated_at = now(),
    version = COALESCE(version, 1) + 1
  WHERE id = p_message_id;
END;
$$;