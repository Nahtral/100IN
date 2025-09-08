-- Phase 1: Database Schema Enhancements for Chat Features

-- Add status column to chats table for archive/delete functionality
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_status ON public.chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_status_created ON public.chats(status, created_at DESC);

-- Add enhanced columns to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id),
ADD COLUMN IF NOT EXISTS language_code TEXT,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for message performance
CREATE INDEX IF NOT EXISTS idx_messages_reply ON public.chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_chat_status_created ON public.chat_messages(chat_id, status, created_at DESC);

-- Create view for chat display names (auto-naming for 1:1 chats)
CREATE OR REPLACE VIEW public.v_chat_display AS
SELECT
  c.id as chat_id,
  c.chat_type = 'group' as is_group,
  c.name as original_name,
  CASE
    WHEN c.chat_type = 'group' THEN COALESCE(c.name, 'Group Chat')
    ELSE (
      SELECT COALESCE(p.full_name, p.email, 'Unknown User')
      FROM public.chat_participants cp
      JOIN public.profiles p ON p.id = cp.user_id
      WHERE cp.chat_id = c.id AND cp.user_id != auth.uid()
      LIMIT 1
    )
  END as display_name,
  c.status,
  c.created_at,
  c.updated_at,
  c.last_message_at,
  c.is_archived,
  c.is_pinned
FROM public.chats c;

-- RPC: Update chat status and title
CREATE OR REPLACE FUNCTION public.rpc_update_chat(
  p_chat_id UUID,
  p_status TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chat_record RECORD;
BEGIN
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.chat_id = p_chat_id AND cp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a participant in this chat';
  END IF;

  -- Get chat info
  SELECT * INTO chat_record FROM public.chats WHERE id = p_chat_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;

  -- Update chat
  UPDATE public.chats 
  SET 
    status = COALESCE(p_status, status),
    name = CASE 
      WHEN chat_type = 'group' AND p_title IS NOT NULL THEN p_title 
      ELSE name 
    END,
    updated_at = now()
  WHERE id = p_chat_id;
END;
$$;

-- RPC: Edit or recall message (time-limited)
CREATE OR REPLACE FUNCTION public.rpc_edit_or_recall_message(
  p_message_id UUID,
  p_new_content TEXT DEFAULT NULL,
  p_recall BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_record RECORD;
  time_diff INTERVAL;
BEGIN
  -- Get message and verify ownership
  SELECT * INTO message_record 
  FROM public.chat_messages 
  WHERE id = p_message_id AND sender_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or not owned by user';
  END IF;

  time_diff := now() - message_record.created_at;

  IF p_recall THEN
    -- Recall within 2 minutes
    IF time_diff > INTERVAL '2 minutes' THEN
      RAISE EXCEPTION 'Recall window expired (2 minutes limit)';
    END IF;
    
    UPDATE public.chat_messages 
    SET 
      status = 'recalled',
      content = '[Message recalled]',
      updated_at = now()
    WHERE id = p_message_id;
  ELSE
    -- Edit within 15 minutes
    IF time_diff > INTERVAL '15 minutes' THEN
      RAISE EXCEPTION 'Edit window expired (15 minutes limit)';
    END IF;
    
    IF p_new_content IS NULL OR trim(p_new_content) = '' THEN
      RAISE EXCEPTION 'New content cannot be empty';
    END IF;
    
    UPDATE public.chat_messages 
    SET 
      content = p_new_content,
      edited_at = now(),
      updated_at = now()
    WHERE id = p_message_id;
  END IF;
END;
$$;

-- RPC: Forward message to multiple chats
CREATE OR REPLACE FUNCTION public.rpc_forward_message(
  p_source_message_id UUID,
  p_target_chat_ids UUID[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_message RECORD;
  target_chat_id UUID;
  forwarded_content TEXT;
BEGIN
  -- Get source message (verify access via participant check)
  SELECT cm.* INTO source_message
  FROM public.chat_messages cm
  JOIN public.chat_participants cp ON cp.chat_id = cm.chat_id
  WHERE cm.id = p_source_message_id 
    AND cp.user_id = auth.uid()
    AND cm.status = 'visible';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source message not found or access denied';
  END IF;

  -- Prepare forwarded content
  forwarded_content := CASE 
    WHEN source_message.status = 'recalled' THEN '[Message was recalled]'
    ELSE source_message.content
  END;

  -- Insert forwarded messages to target chats
  FOREACH target_chat_id IN ARRAY p_target_chat_ids
  LOOP
    -- Verify user is participant in target chat
    IF EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = target_chat_id AND cp.user_id = auth.uid()
    ) THEN
      INSERT INTO public.chat_messages (
        chat_id, 
        sender_id, 
        content, 
        message_type,
        created_at
      ) VALUES (
        target_chat_id,
        auth.uid(),
        '📄 Forwarded: ' || forwarded_content,
        'text',
        now()
      );
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_update_chat(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_edit_or_recall_message(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_forward_message(UUID, UUID[]) TO authenticated;

-- Update RLS policies for new columns
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
CREATE POLICY "Users can view active chats they participate in" ON public.chats
FOR SELECT USING (
  status != 'deleted' AND 
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
  )
);

-- Allow viewing display names
GRANT SELECT ON public.v_chat_display TO authenticated;