-- Fix mark_notification_read function to remove updated_at reference
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.notifications 
  SET 
    is_read = true, 
    read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Fix mark_notification_unread function to remove updated_at reference
CREATE OR REPLACE FUNCTION public.mark_notification_unread(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.notifications 
  SET 
    is_read = false, 
    read_at = null
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;