-- Fix ambiguous column references and implement schema-safe chat RPCs

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS public.rpc_list_chats(integer, integer);
DROP FUNCTION IF EXISTS public.rpc_get_messages(uuid, integer, timestamp with time zone);
DROP FUNCTION IF EXISTS public.rpc_mark_read(uuid);

-- List chats for current user with last message + unread count (schema-safe)
CREATE OR REPLACE FUNCTION public.rpc_list_chats(limit_n int DEFAULT 30, offset_n int DEFAULT 0)
RETURNS TABLE (
  chat_id uuid,
  chat_title text,
  chat_is_group boolean,
  last_msg text,
  last_msg_at timestamptz,
  unread_count bigint
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_chats AS (
    SELECT c.id as chat_id, c.name as chat_title, 
           CASE WHEN c.chat_type = 'group' THEN true ELSE false END as chat_is_group
    FROM public.chats c
    JOIN public.chat_participants p
      ON p.chat_id = c.id
    WHERE p.user_id = auth.uid()
  ),
  last AS (
    SELECT m.chat_id,
           m.content as last_msg,
           m.created_at as last_msg_at,
           row_number() OVER (PARTITION BY m.chat_id ORDER BY m.created_at DESC) as rn
    FROM public.chat_messages m
    JOIN my_chats mc ON mc.chat_id = m.chat_id
    WHERE m.is_deleted = false
  ),
  unread AS (
    SELECT m.chat_id,
           count(*)::bigint as unread_count
    FROM public.chat_messages m
    JOIN public.chat_participants p
      ON p.chat_id = m.chat_id AND p.user_id = auth.uid()
    WHERE p.last_read_at IS NULL OR m.created_at > p.last_read_at
    GROUP BY m.chat_id
  )
  SELECT mc.chat_id,
         mc.chat_title,
         mc.chat_is_group,
         l.last_msg,
         l.last_msg_at,
         COALESCE(u.unread_count, 0) as unread_count
  FROM my_chats mc
  LEFT JOIN last l ON l.chat_id = mc.chat_id AND l.rn = 1
  LEFT JOIN unread u ON u.chat_id = mc.chat_id
  ORDER BY COALESCE(l.last_msg_at, to_timestamp(0)) DESC
  LIMIT limit_n OFFSET offset_n;
$$;

-- Paginated messages (explicitly qualify columns)
CREATE OR REPLACE FUNCTION public.rpc_get_messages(chat uuid, limit_n int DEFAULT 50, before timestamptz DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  chat_id uuid,
  sender_id uuid,
  body text,
  attachment_url text,
  created_at timestamptz,
  edited_at timestamptz,
  sender_name text,
  sender_email text,
  reactions jsonb,
  message_type text
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, 
         m.chat_id, 
         m.sender_id, 
         m.content as body, 
         m.attachment_url, 
         m.created_at, 
         m.edited_at,
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
           ) FROM public.message_reactions mr WHERE mr.message_id = m.id),
           '[]'::jsonb
         ) as reactions,
         m.message_type
  FROM public.chat_messages m
  LEFT JOIN public.profiles p ON m.sender_id = p.id
  WHERE m.chat_id = chat
    AND (before IS NULL OR m.created_at < before)
    AND m.is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = chat AND cp.user_id = auth.uid()
    )
  ORDER BY m.created_at DESC
  LIMIT limit_n;
$$;

-- Mark read (schema-safe)
CREATE OR REPLACE FUNCTION public.rpc_mark_read(chat uuid)
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_participants
  SET last_read_at = now()
  WHERE chat_id = chat AND user_id = auth.uid();
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created
  ON public.chat_messages(chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_chat
  ON public.chat_participants(user_id, chat_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON public.message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_profiles_id_name
  ON public.profiles(id, full_name, email);

-- Ensure RLS policies for chat functionality
DO $$
BEGIN
  -- Chat participants can view chats they're part of
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can view chats they participate in'
  ) THEN
    CREATE POLICY "Users can view chats they participate in" ON public.chats
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_id = chats.id AND user_id = auth.uid()
      )
    );
  END IF;

  -- Chat participants can view messages in their chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can view messages in their chats'
  ) THEN
    CREATE POLICY "Users can view messages in their chats" ON public.chat_messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_id = chat_messages.chat_id AND user_id = auth.uid()
      )
    );
  END IF;

  -- Chat participants can send messages to their chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can send messages to their chats'
  ) THEN
    CREATE POLICY "Users can send messages to their chats" ON public.chat_messages
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_id = chat_messages.chat_id AND user_id = auth.uid()
      ) AND sender_id = auth.uid()
    );
  END IF;
END
$$;