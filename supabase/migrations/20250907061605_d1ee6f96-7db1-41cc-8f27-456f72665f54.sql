-- Fix security warning: Remove SECURITY DEFINER from view
-- Views should not use SECURITY DEFINER as it bypasses RLS

DROP VIEW IF EXISTS public.v_chat_display;

-- Create the view without SECURITY DEFINER to respect RLS
CREATE VIEW public.v_chat_display AS
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
FROM public.chats c
WHERE EXISTS (
  SELECT 1 FROM public.chat_participants cp 
  WHERE cp.chat_id = c.id AND cp.user_id = auth.uid()
);

-- Grant access to authenticated users
GRANT SELECT ON public.v_chat_display TO authenticated;