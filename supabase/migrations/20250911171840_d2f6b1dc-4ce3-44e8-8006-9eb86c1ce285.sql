-- Create database triggers for real-time chat notifications
-- This ensures notifications are sent via Edge Functions for better reliability

-- Function to send chat notifications via Edge Function
CREATE OR REPLACE FUNCTION notify_chat_change()
RETURNS TRIGGER AS $$
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
        'You have been added to a new chat: ' || NEW.name
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for chat table
DROP TRIGGER IF EXISTS notify_chat_insert ON public.chats;
CREATE TRIGGER notify_chat_insert
  AFTER INSERT ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_change();

-- Create triggers for chat_messages table  
DROP TRIGGER IF EXISTS notify_message_insert ON public.chat_messages;
CREATE TRIGGER notify_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_change();

-- Ensure we have a chat notification type
INSERT INTO public.notification_types (name, description, category, icon)
VALUES ('chat', 'Chat and messaging notifications', 'communication', '💬')
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon;