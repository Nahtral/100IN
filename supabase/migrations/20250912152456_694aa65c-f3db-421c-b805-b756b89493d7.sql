-- Create missing RPC functions for chat system

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

-- 4. Function to clean up deleted chats and create test data
CREATE OR REPLACE FUNCTION public.setup_chat_test_data(target_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  test_chat_id UUID;
  other_user_id UUID;
  result JSON;
BEGIN
  -- Only super admins can run this setup function
  IF NOT is_super_admin(target_user_id) THEN
    RAISE EXCEPTION 'Only super admins can setup test data';
  END IF;

  -- Get another user to create a test chat with
  SELECT id INTO other_user_id
  FROM public.profiles
  WHERE id != target_user_id AND approval_status = 'approved'
  LIMIT 1;
  
  IF other_user_id IS NULL THEN
    RAISE EXCEPTION 'No other approved users found for test chat';
  END IF;
  
  -- Create a test group chat
  INSERT INTO public.chats (
    name, chat_type, created_by, status, created_at, updated_at
  ) VALUES (
    'Test Group Chat', 'group', target_user_id, 'active', now(), now()
  ) RETURNING id INTO test_chat_id;
  
  -- Add participants
  INSERT INTO public.chat_participants (chat_id, user_id, role, joined_at, last_read_at) VALUES
    (test_chat_id, target_user_id, 'admin', now(), now()),
    (test_chat_id, other_user_id, 'member', now(), now());
  
  -- Add some test messages
  INSERT INTO public.chat_messages (chat_id, sender_id, content, message_type, status, created_at) VALUES
    (test_chat_id, target_user_id, 'Hello! This is a test message.', 'text', 'visible', now() - interval '5 minutes'),
    (test_chat_id, other_user_id, 'Hi there! Great to chat with you.', 'text', 'visible', now() - interval '3 minutes'),
    (test_chat_id, target_user_id, 'How are you doing today?', 'text', 'visible', now() - interval '1 minute');
  
  -- Update chat last_message_at
  UPDATE public.chats 
  SET last_message_at = now() - interval '1 minute'
  WHERE id = test_chat_id;
  
  result := json_build_object(
    'success', true,
    'test_chat_id', test_chat_id,
    'other_user_id', other_user_id,
    'message', 'Test chat data created successfully'
  );
  
  RETURN result;
END;
$$;