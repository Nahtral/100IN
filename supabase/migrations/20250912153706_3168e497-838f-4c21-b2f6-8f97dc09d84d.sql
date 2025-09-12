-- Fix send_message_idempotent function to handle missing name field
DROP FUNCTION IF EXISTS public.send_message_idempotent(uuid, uuid, text, text, text, text, text, bigint, uuid);

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
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_msg_id uuid;
  new_msg_id uuid;
  result jsonb;
BEGIN
  -- Check if message with client_msg_id already exists
  SELECT id INTO existing_msg_id 
  FROM public.chat_messages 
  WHERE client_msg_id = p_client_msg_id AND sender_id = p_sender_id;
  
  IF existing_msg_id IS NOT NULL THEN
    -- Message already exists, return it
    SELECT jsonb_build_object(
      'id', id,
      'chat_id', chat_id,
      'sender_id', sender_id,
      'content', content,
      'message_type', message_type,
      'created_at', created_at,
      'duplicate', true
    ) INTO result
    FROM public.chat_messages
    WHERE id = existing_msg_id;
    
    RETURN result;
  END IF;
  
  -- Verify user is participant in chat
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = p_chat_id AND user_id = p_sender_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;
  
  -- Insert new message
  INSERT INTO public.chat_messages (
    chat_id,
    sender_id,
    content,
    message_type,
    attachment_url,
    attachment_name,
    attachment_size,
    reply_to_id,
    client_msg_id,
    created_at
  ) VALUES (
    p_chat_id,
    p_sender_id,
    p_content,
    p_message_type,
    p_attachment_url,
    p_attachment_name,
    p_attachment_size,
    p_reply_to_id,
    p_client_msg_id,
    now()
  ) RETURNING id INTO new_msg_id;
  
  -- Build result
  SELECT jsonb_build_object(
    'id', id,
    'chat_id', chat_id,
    'sender_id', sender_id,
    'content', content,
    'message_type', message_type,
    'attachment_url', attachment_url,
    'attachment_name', attachment_name,
    'attachment_size', attachment_size,
    'reply_to_id', reply_to_id,
    'created_at', created_at,
    'duplicate', false
  ) INTO result
  FROM public.chat_messages
  WHERE id = new_msg_id;
  
  RETURN result;
END;
$$;