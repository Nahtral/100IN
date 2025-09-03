-- Fix security warnings from the linter

-- Fix function search path mutable issue by ensuring all functions have proper search_path
-- The functions we created already have SET search_path = 'public' so they should be fine
-- But let's ensure consistency across all our functions

-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications 
  SET 
    is_read = true, 
    read_at = now(),
    updated_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_unread(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications 
  SET 
    is_read = false, 
    read_at = null,
    updated_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_notification(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notifications_paginated(
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 25
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  type_id uuid,
  title text,
  message text,
  data jsonb,
  read_at timestamp with time zone,
  is_read boolean,
  priority text,
  action_url text,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  type_name text,
  type_description text,
  type_category text,
  type_icon text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    n.id,
    n.user_id,
    n.type_id,
    n.title,
    n.message,
    n.data,
    n.read_at,
    n.is_read,
    n.priority,
    n.action_url,
    n.related_entity_type,
    n.related_entity_id,
    n.created_at,
    n.expires_at,
    nt.name as type_name,
    nt.description as type_description,
    nt.category as type_category,
    nt.icon as type_icon
  FROM public.notifications n
  LEFT JOIN public.notification_types nt ON n.type_id = nt.id
  WHERE n.user_id = auth.uid()
    AND (n.expires_at IS NULL OR n.expires_at > now())
  ORDER BY n.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;