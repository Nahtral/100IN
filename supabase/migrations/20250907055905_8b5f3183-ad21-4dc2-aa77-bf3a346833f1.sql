-- Ensure proper table structure with correct references
ALTER TABLE chats 
  DROP CONSTRAINT IF EXISTS chats_created_by_fkey,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false;

-- Update chat_participants to match expected schema
ALTER TABLE chat_participants 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_created 
  ON chat_messages(chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user 
  ON chat_participants(user_id, chat_id);

-- Create atomic chat creation RPC
CREATE OR REPLACE FUNCTION rpc_create_chat(
  p_title TEXT DEFAULT NULL,
  p_is_group BOOLEAN DEFAULT FALSE,
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

-- Ensure RLS policies allow RPC execution
DROP POLICY IF EXISTS "Chat creators and admins can manage participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can join chats they're invited to" ON chat_participants;

CREATE POLICY "Users can view participants in their chats" ON chat_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp2 
    WHERE cp2.chat_id = chat_participants.chat_id 
    AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert participants via RPC" ON chat_participants
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage participants" ON chat_participants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = chat_participants.chat_id 
    AND c.created_by = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.chat_id = chat_participants.chat_id 
    AND cp2.user_id = auth.uid() 
    AND cp2.role = 'admin'
  )
);