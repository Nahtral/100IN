-- Create notification types table
CREATE TABLE public.notification_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'general',
  icon text,
  default_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type_id uuid REFERENCES public.notification_types(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read_at timestamp with time zone,
  is_read boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url text,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type_id uuid REFERENCES public.notification_types(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, type_id)
);

-- Enable RLS on all tables
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_types
CREATE POLICY "All authenticated users can view notification types"
ON public.notification_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage notification types"
ON public.notification_types
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Super admins can manage all notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read_status ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON public.notifications(priority);

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications 
  SET is_read = true, read_at = now() 
  WHERE id = notification_id AND user_id = auth.uid();
$$;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(user_uuid uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications 
  SET is_read = true, read_at = now() 
  WHERE user_id = user_uuid AND is_read = false;
$$;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE user_id = user_uuid AND is_read = false AND (expires_at IS NULL OR expires_at > now());
$$;

-- Create function to create notification
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
SET search_path = public
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

-- Insert default notification types
INSERT INTO public.notification_types (name, description, category, icon, default_enabled) VALUES
('chat_message', 'New chat message received', 'communication', 'MessageCircle', true),
('chat_mention', 'You were mentioned in a chat', 'communication', 'AtSign', true),
('schedule_change', 'Practice or game schedule changed', 'team', 'Calendar', true),
('schedule_reminder', 'Upcoming practice or game reminder', 'team', 'Clock', true),
('injury_report', 'New injury report filed', 'medical', 'AlertTriangle', true),
('medical_clearance', 'Medical clearance update', 'medical', 'Shield', true),
('health_check_reminder', 'Daily health check-in reminder', 'medical', 'Heart', true),
('evaluation_complete', 'Player evaluation completed', 'performance', 'BarChart3', true),
('performance_milestone', 'Performance milestone achieved', 'performance', 'Trophy', true),
('team_announcement', 'Team announcement', 'team', 'Megaphone', true),
('roster_update', 'Team roster updated', 'team', 'Users', true),
('payroll_processed', 'Payroll has been processed', 'hr', 'DollarSign', true),
('timeoff_approved', 'Time-off request approved', 'hr', 'CheckCircle', true),
('timeoff_denied', 'Time-off request denied', 'hr', 'XCircle', true),
('schedule_conflict', 'Employee schedule conflict detected', 'hr', 'AlertCircle', true),
('task_assigned', 'New task assigned to you', 'task', 'CheckSquare', true),
('task_due_soon', 'Task due date approaching', 'task', 'Clock', true),
('system_maintenance', 'System maintenance notification', 'system', 'Settings', true),
('security_alert', 'Security alert', 'system', 'Shield', true);

-- Create trigger to update updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  RETURN NULL;
END;
$$;

-- Create a function to be called periodically to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notifications 
  WHERE (expires_at IS NOT NULL AND expires_at < now()) 
     OR (created_at < now() - interval '30 days' AND is_read = true);
$$;