-- Fix security issue by removing SECURITY DEFINER from RPC
-- The view doesn't need SECURITY DEFINER as it respects RLS policies

-- Drop and recreate the RPC without SECURITY DEFINER
DROP FUNCTION IF EXISTS public.rpc_list_chats_enhanced;

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
STABLE
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_list_chats_enhanced TO authenticated;