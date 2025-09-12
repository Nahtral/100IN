-- Create test chat data directly
DO $$
DECLARE
  current_user_id UUID;
  test_chat_id UUID;
BEGIN
  -- Get current super admin user
  SELECT id INTO current_user_id 
  FROM public.profiles 
  WHERE approval_status = 'approved' 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'No approved users found';
    RETURN;
  END IF;
  
  -- Create a test group chat
  INSERT INTO public.chats (
    name, chat_type, created_by, status, created_at, updated_at, last_message_at
  ) VALUES (
    'General Discussion', 'group', current_user_id, 'active', now(), now(), now()
  ) RETURNING id INTO test_chat_id;
  
  -- Add creator as admin participant
  INSERT INTO public.chat_participants (chat_id, user_id, role, joined_at, last_read_at) VALUES
    (test_chat_id, current_user_id, 'admin', now(), now());
  
  -- Add some test messages
  INSERT INTO public.chat_messages (chat_id, sender_id, content, message_type, status, created_at) VALUES
    (test_chat_id, current_user_id, 'Welcome to the General Discussion chat!', 'text', 'visible', now() - interval '10 minutes'),
    (test_chat_id, current_user_id, 'This is a test message to verify the chat system is working.', 'text', 'visible', now() - interval '5 minutes'),
    (test_chat_id, current_user_id, 'You can now send and receive messages in real-time.', 'text', 'visible', now() - interval '2 minutes');
  
  RAISE NOTICE 'Created test chat with ID: %', test_chat_id;
END $$;