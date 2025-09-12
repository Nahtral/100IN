-- Fix notify_chat_change to avoid referencing NEW.name for chat_messages
CREATE OR REPLACE FUNCTION public.notify_chat_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert a notification record that will be processed by the notification system
  INSERT INTO public.notifications (
    user_id,
    type_id,
    title,
    message,
    data,
    priority,
    related_entity_type,
    related_entity_id
  )
  SELECT 
    cp.user_id,
    (SELECT id FROM public.notification_types WHERE name = 'chat' LIMIT 1),
    CASE 
      WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'chat_messages' THEN 'New Message'
      WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'chats' THEN 'New Chat'
      ELSE 'Chat Update'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'chat_messages' THEN 
        'You have a new message in ' || COALESCE(c.name, 'a chat')
      WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'chats' THEN 
        'You have been added to a new chat: ' || COALESCE(c.name, 'a chat')
      ELSE 'Chat has been updated'
    END,
    jsonb_build_object(
      'chat_id', COALESCE(NEW.chat_id, NEW.id),
      'message_id', CASE WHEN TG_TABLE_NAME = 'chat_messages' THEN NEW.id ELSE null END,
      'sender_id', CASE WHEN TG_TABLE_NAME = 'chat_messages' THEN NEW.sender_id ELSE NEW.created_by END,
      'event_type', TG_OP,
      'table_name', TG_TABLE_NAME
    ),
    'normal',
    'chat_update',
    COALESCE(NEW.chat_id, NEW.id)
  FROM public.chat_participants cp
  LEFT JOIN public.chats c ON c.id = COALESCE(NEW.chat_id, NEW.id)
  WHERE cp.chat_id = COALESCE(NEW.chat_id, NEW.id)
    AND cp.user_id != COALESCE(NEW.sender_id, NEW.created_by); -- Don't notify the sender

  RETURN NEW;
END;
$function$;