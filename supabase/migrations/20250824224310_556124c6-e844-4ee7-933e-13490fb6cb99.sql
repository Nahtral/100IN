-- Fix search path security warning by updating all functions to have immutable search_path
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.notifications 
  SET is_read = true, read_at = now() 
  WHERE id = notification_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.notifications 
  SET is_read = true, read_at = now() 
  WHERE user_id = user_uuid AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE user_id = user_uuid AND is_read = false AND (expires_at IS NULL OR expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_data jsonb DEFAULT '{}',
  notification_priority text DEFAULT 'normal',
  notification_action_url text DEFAULT NULL,
  entity_type text DEFAULT NULL,
  entity_id uuid DEFAULT NULL,
  expiry_hours integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  type_uuid uuid;
  notification_uuid uuid;
  expiry_time timestamp with time zone;
BEGIN
  -- Get type ID
  SELECT id INTO type_uuid FROM public.notification_types WHERE name = notification_type;
  
  -- If type doesn't exist, create it
  IF type_uuid IS NULL THEN
    INSERT INTO public.notification_types (name, description, category)
    VALUES (notification_type, notification_type, 'system')
    RETURNING id INTO type_uuid;
  END IF;
  
  -- Calculate expiry time
  IF expiry_hours IS NOT NULL THEN
    expiry_time := now() + (expiry_hours || ' hours')::interval;
  END IF;
  
  -- Create notification
  INSERT INTO public.notifications (
    user_id, type_id, title, message, data, priority, 
    action_url, related_entity_type, related_entity_id, expires_at
  )
  VALUES (
    target_user_id, type_uuid, notification_title, notification_message, 
    notification_data, notification_priority, notification_action_url, 
    entity_type, entity_id, expiry_time
  )
  RETURNING id INTO notification_uuid;
  
  RETURN notification_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.notifications 
  WHERE (expires_at IS NOT NULL AND expires_at < now()) 
     OR (created_at < now() - interval '30 days' AND is_read = true);
$$;