-- Create atomic chat creation RPC with corrected parameter syntax
CREATE OR REPLACE FUNCTION rpc_create_chat(
  p_title TEXT,
  p_is_group BOOLEAN,
  p_participants UUID[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_chat_id UUID;
  uid UUID := auth.uid();
  participant_id UUID;
BEGIN
  -- Authentication check
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- At least 1 other participant required
  IF array_length(p_participants, 1) IS NULL OR array_length(p_participants, 1) = 0 THEN
    RAISE EXCEPTION 'At least one participant required';
  END IF;

  -- Create chat
  INSERT INTO chats (name, chat_type, created_by, is_archived, is_pinned, last_message_at)
  VALUES (
    COALESCE(p_title, 'Direct Chat'), 
    CASE WHEN p_is_group THEN 'group' ELSE 'private' END,
    uid,
    false,
    false,
    now()
  )
  RETURNING id INTO new_chat_id;

  -- Add creator as admin
  INSERT INTO chat_participants (chat_id, user_id, role, joined_at, last_read_at)
  VALUES (new_chat_id, uid, 'admin', now(), now());

  -- Add other participants as members
  FOREACH participant_id IN ARRAY p_participants
  LOOP
    IF participant_id != uid THEN
      INSERT INTO chat_participants (chat_id, user_id, role, joined_at, last_read_at)
      VALUES (new_chat_id, participant_id, 'member', now(), now())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN new_chat_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION rpc_create_chat(TEXT, BOOLEAN, UUID[]) TO authenticated;