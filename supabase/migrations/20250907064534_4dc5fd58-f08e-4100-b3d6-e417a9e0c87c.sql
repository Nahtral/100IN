-- The issue is likely that there are old views with SECURITY DEFINER
-- Let me check and fix the main v_chat_display view

-- Drop and recreate the view without any SECURITY DEFINER
DROP VIEW IF EXISTS public.v_chat_display;

-- Create regular view that respects RLS policies
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