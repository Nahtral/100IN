-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_chat_display;

-- Create enhanced view for chat display with correct participant info
CREATE VIEW public.v_chat_display AS
SELECT 
  c.id as chat_id,
  c.name as original_name,
  c.chat_type,
  c.status,
  c.is_archived,
  c.is_pinned,
  c.created_at,
  c.updated_at,
  c.last_message_at,
  -- Dynamic title based on chat type
  CASE 
    WHEN c.chat_type = 'group' THEN COALESCE(c.name, 'Group Chat')
    WHEN c.chat_type = 'private' THEN 
      COALESCE(
        (SELECT p.full_name 
         FROM chat_participants cp2 
         JOIN profiles p ON cp2.user_id = p.id 
         WHERE cp2.chat_id = c.id 
           AND cp2.user_id != auth.uid() 
         LIMIT 1),
        'Private Chat'
      )
    ELSE COALESCE(c.name, 'Chat')
  END as display_title,
  -- Participant count
  (SELECT COUNT(*) FROM chat_participants cp WHERE cp.chat_id = c.id) as member_count,
  -- Last activity time (message time or chat creation)
  COALESCE(c.last_message_at, c.created_at) as last_activity_at,
  -- Last message content
  (SELECT cm.content 
   FROM chat_messages cm 
   WHERE cm.chat_id = c.id 
     AND cm.is_deleted = false 
   ORDER BY cm.created_at DESC 
   LIMIT 1) as last_message_content,
  -- Unread count for current user
  COALESCE(
    (SELECT COUNT(*)
     FROM chat_messages cm2
     JOIN chat_participants cp3 ON cp3.chat_id = cm2.chat_id
     WHERE cm2.chat_id = c.id
       AND cp3.user_id = auth.uid()
       AND (cp3.last_read_at IS NULL OR cm2.created_at > cp3.last_read_at)
       AND cm2.is_deleted = false
    ), 0
  ) as unread_count,
  -- Check if user is group admin
  EXISTS(
    SELECT 1 FROM chat_participants cp4 
    WHERE cp4.chat_id = c.id 
      AND cp4.user_id = auth.uid() 
      AND cp4.role = 'admin'
  ) as is_admin
FROM chats c
WHERE EXISTS (
  SELECT 1 FROM chat_participants cp
  WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
);

-- Enhanced RPC for listing chats with correct display data
CREATE OR REPLACE FUNCTION public.rpc_list_chats_enhanced(
  limit_n INTEGER DEFAULT 30,
  offset_n INTEGER DEFAULT 0,
  include_archived BOOLEAN DEFAULT false
)
RETURNS TABLE(
  chat_id UUID,
  display_title TEXT,
  chat_type TEXT,
  member_count BIGINT,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  last_message_content TEXT,
  unread_count BIGINT,
  is_admin BOOLEAN,
  is_archived BOOLEAN,
  is_pinned BOOLEAN
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    vcd.chat_id,
    vcd.display_title,
    vcd.chat_type,
    vcd.member_count,
    vcd.last_activity_at,
    vcd.last_message_content,
    vcd.unread_count,
    vcd.is_admin,
    vcd.is_archived,
    vcd.is_pinned
  FROM v_chat_display vcd
  WHERE (include_archived = true OR vcd.is_archived = false)
  ORDER BY 
    vcd.is_pinned DESC,
    vcd.last_activity_at DESC NULLS LAST
  LIMIT limit_n
  OFFSET offset_n;
$$;

-- RPC for updating chat metadata (rename, archive, etc.)
CREATE OR REPLACE FUNCTION public.rpc_update_chat_meta(
  p_chat_id UUID,
  p_new_title TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chat_record RECORD;
  user_is_admin BOOLEAN := false;
BEGIN
  -- Get chat info and check if user is participant
  SELECT * INTO chat_record 
  FROM chats 
  WHERE id = p_chat_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;
  
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = p_chat_id AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;
  
  -- Check if user is admin (for group chats)
  SELECT EXISTS(
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = p_chat_id 
      AND cp.user_id = auth.uid() 
      AND cp.role = 'admin'
  ) INTO user_is_admin;
  
  -- Update title (only for group chats and only by admins)
  IF p_new_title IS NOT NULL THEN
    IF chat_record.chat_type != 'group' THEN
      RAISE EXCEPTION 'Cannot rename private chats';
    END IF;
    
    IF NOT user_is_admin THEN
      RAISE EXCEPTION 'Only chat admins can rename group chats';
    END IF;
    
    IF LENGTH(TRIM(p_new_title)) < 2 OR LENGTH(TRIM(p_new_title)) > 60 THEN
      RAISE EXCEPTION 'Chat title must be between 2 and 60 characters';
    END IF;
    
    UPDATE chats 
    SET 
      name = TRIM(p_new_title),
      updated_at = now()
    WHERE id = p_chat_id;
  END IF;
  
  -- Update status (archive/unarchive - admins only for groups, any participant for private)
  IF p_new_status IS NOT NULL THEN
    IF chat_record.chat_type = 'group' AND NOT user_is_admin THEN
      RAISE EXCEPTION 'Only chat admins can archive/unarchive group chats';
    END IF;
    
    IF p_new_status NOT IN ('active', 'archived') THEN
      RAISE EXCEPTION 'Invalid status. Must be active or archived';
    END IF;
    
    UPDATE chats 
    SET 
      status = p_new_status,
      is_archived = (p_new_status = 'archived'),
      updated_at = now()
    WHERE id = p_chat_id;
  END IF;
END;
$$;

-- RPC for deleting chats (soft and hard delete)
CREATE OR REPLACE FUNCTION public.rpc_delete_chat(
  p_chat_id UUID,
  p_permanent BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chat_record RECORD;
  user_is_admin BOOLEAN := false;
BEGIN
  -- Get chat info
  SELECT * INTO chat_record 
  FROM chats 
  WHERE id = p_chat_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;
  
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = p_chat_id AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = p_chat_id 
      AND cp.user_id = auth.uid() 
      AND cp.role = 'admin'
  ) INTO user_is_admin;
  
  -- For group chats, only admins can delete
  IF chat_record.chat_type = 'group' AND NOT user_is_admin THEN
    RAISE EXCEPTION 'Only chat admins can delete group chats';
  END IF;
  
  -- Hard delete (permanent) - only super admins
  IF p_permanent THEN
    IF NOT is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only super admins can permanently delete chats';
    END IF;
    
    -- Delete all related data
    DELETE FROM message_reactions WHERE message_id IN (
      SELECT id FROM chat_messages WHERE chat_id = p_chat_id
    );
    DELETE FROM chat_messages WHERE chat_id = p_chat_id;
    DELETE FROM chat_participants WHERE chat_id = p_chat_id;
    DELETE FROM chats WHERE id = p_chat_id;
  ELSE
    -- Soft delete
    UPDATE chats 
    SET 
      status = 'deleted',
      updated_at = now()
    WHERE id = p_chat_id;
  END IF;
END;
$$;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.rpc_list_chats_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_chat_meta TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delete_chat TO authenticated;

-- Ensure chats.created_at has proper default
ALTER TABLE chats ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE chats ALTER COLUMN updated_at SET DEFAULT now();