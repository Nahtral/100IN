-- Fix security warnings by setting search_path on existing functions
ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION update_chat_last_message() SET search_path = public;

-- Create optimized RPC functions for chat operations
CREATE OR REPLACE FUNCTION rpc_list_chats(
  limit_n INTEGER DEFAULT 30,
  offset_n INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  chat_type TEXT,
  created_by UUID,
  team_id UUID,
  is_archived BOOLEAN,
  is_pinned BOOLEAN,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_message_content TEXT,
  last_message_sender TEXT,
  unread_count BIGINT,
  participant_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.chat_type,
    c.created_by,
    c.team_id,
    c.is_archived,
    c.is_pinned,
    c.last_message_at,
    c.created_at,
    c.updated_at,
    lm.content as last_message_content,
    COALESCE(lm_profile.full_name, lm_profile.email, 'Unknown') as last_message_sender,
    COALESCE(
      (SELECT COUNT(*) 
       FROM chat_messages cm 
       JOIN chat_participants cp_read ON cp_read.chat_id = cm.chat_id
       WHERE cm.chat_id = c.id 
         AND cp_read.user_id = auth.uid()
         AND cm.created_at > cp_read.last_read_at), 
      0
    ) as unread_count,
    (SELECT COUNT(*) FROM chat_participants WHERE chat_id = c.id) as participant_count
  FROM chats c
  JOIN chat_participants cp ON c.id = cp.chat_id
  LEFT JOIN LATERAL (
    SELECT content, sender_id
    FROM chat_messages 
    WHERE chat_id = c.id AND is_deleted = false
    ORDER BY created_at DESC 
    LIMIT 1
  ) lm ON true
  LEFT JOIN profiles lm_profile ON lm.sender_id = lm_profile.id
  WHERE cp.user_id = auth.uid()
    AND (NOT c.is_archived OR c.is_archived = false)
  ORDER BY c.updated_at DESC
  LIMIT limit_n
  OFFSET offset_n;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_get_messages(
  chat_id_param UUID,
  limit_n INTEGER DEFAULT 50,
  before_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  chat_id UUID,
  sender_id UUID,
  content TEXT,
  message_type TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size BIGINT,
  reply_to_id UUID,
  is_edited BOOLEAN,
  is_deleted BOOLEAN,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_name TEXT,
  sender_email TEXT,
  reactions JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = chat_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;

  RETURN QUERY
  SELECT 
    cm.id,
    cm.chat_id,
    cm.sender_id,
    cm.content,
    cm.message_type,
    cm.attachment_url,
    cm.attachment_name,
    cm.attachment_size,
    cm.reply_to_id,
    cm.is_edited,
    cm.is_deleted,
    cm.edited_at,
    cm.created_at,
    COALESCE(p.full_name, p.email, 'Unknown') as sender_name,
    p.email as sender_email,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', mr.id,
          'emoji', mr.emoji,
          'user_id', mr.user_id,
          'created_at', mr.created_at
        )
      ) FROM message_reactions mr WHERE mr.message_id = cm.id),
      '[]'::jsonb
    ) as reactions
  FROM chat_messages cm
  LEFT JOIN profiles p ON cm.sender_id = p.id
  WHERE cm.chat_id = chat_id_param
    AND cm.is_deleted = false
    AND (before_cursor IS NULL OR cm.created_at < before_cursor)
  ORDER BY cm.created_at DESC
  LIMIT limit_n;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_create_chat(
  chat_name TEXT,
  chat_type_param TEXT,
  participant_ids UUID[],
  team_id_param UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_chat_id UUID;
  participant_id UUID;
BEGIN
  -- Validate chat type
  IF chat_type_param NOT IN ('private', 'group', 'team') THEN
    RAISE EXCEPTION 'Invalid chat type: %', chat_type_param;
  END IF;

  -- Create chat
  INSERT INTO chats (name, chat_type, created_by, team_id)
  VALUES (chat_name, chat_type_param, auth.uid(), team_id_param)
  RETURNING id INTO new_chat_id;

  -- Add creator as admin
  INSERT INTO chat_participants (chat_id, user_id, role)
  VALUES (new_chat_id, auth.uid(), 'admin');

  -- Add other participants
  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != auth.uid() THEN
      INSERT INTO chat_participants (chat_id, user_id, role)
      VALUES (new_chat_id, participant_id, 'member')
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN new_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_send_message(
  chat_id_param UUID,
  content_param TEXT,
  message_type_param TEXT DEFAULT 'text',
  attachment_url_param TEXT DEFAULT NULL,
  attachment_name_param TEXT DEFAULT NULL,
  attachment_size_param BIGINT DEFAULT NULL,
  reply_to_id_param UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_message_id UUID;
BEGIN
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chat_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;

  -- Insert message
  INSERT INTO chat_messages (
    chat_id, sender_id, content, message_type, 
    attachment_url, attachment_name, attachment_size, reply_to_id
  )
  VALUES (
    chat_id_param, auth.uid(), content_param, message_type_param,
    attachment_url_param, attachment_name_param, attachment_size_param, reply_to_id_param
  )
  RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc_mark_read(
  chat_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_read_at for the user
  UPDATE chat_participants 
  SET last_read_at = now()
  WHERE chat_id = chat_id_param AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION rpc_get_chat_participants(
  chat_id_param UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = chat_id_param AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;

  RETURN QUERY
  SELECT 
    cp.id,
    cp.user_id,
    cp.role,
    cp.joined_at,
    COALESCE(p.full_name, p.email, 'Unknown') as user_name,
    p.email as user_email
  FROM chat_participants cp
  LEFT JOIN profiles p ON cp.user_id = p.id
  WHERE cp.chat_id = chat_id_param
  ORDER BY cp.joined_at;
END;
$$;