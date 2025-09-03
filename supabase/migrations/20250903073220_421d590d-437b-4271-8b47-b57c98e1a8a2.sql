-- Add new columns to schedules table for enhanced management
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for event images
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "Super admins can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update event images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-images' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete event images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-images' AND is_super_admin(auth.uid()));

-- Create RPC function for duplicating events
CREATE OR REPLACE FUNCTION public.rpc_duplicate_event(
  event_id UUID,
  shift_days INTEGER DEFAULT 0,
  copy_teams BOOLEAN DEFAULT true,
  new_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original_event RECORD;
  new_event_id UUID;
  shifted_start_time TIMESTAMP WITH TIME ZONE;
  shifted_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only super admins can duplicate events
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can duplicate events';
  END IF;

  -- Get the original event
  SELECT * INTO original_event FROM public.schedules WHERE id = event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Calculate shifted times
  shifted_start_time := original_event.start_time + (shift_days || ' days')::INTERVAL;
  shifted_end_time := original_event.end_time + (shift_days || ' days')::INTERVAL;

  -- Insert duplicate event
  INSERT INTO public.schedules (
    title,
    event_type,
    start_time,
    end_time,
    location,
    opponent,
    description,
    team_ids,
    image_url,
    status,
    is_recurring,
    created_by
  ) VALUES (
    COALESCE(new_title, original_event.title || ' (Copy)'),
    original_event.event_type,
    shifted_start_time,
    shifted_end_time,
    original_event.location,
    original_event.opponent,
    original_event.description,
    CASE WHEN copy_teams THEN original_event.team_ids ELSE NULL END,
    original_event.image_url,
    'active',
    false, -- Don't duplicate recurring settings
    auth.uid()
  ) RETURNING id INTO new_event_id;

  -- Log the duplication action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    auth.uid(), 
    'event_duplicated',
    jsonb_build_object(
      'original_event_id', event_id,
      'new_event_id', new_event_id,
      'shift_days', shift_days,
      'copy_teams', copy_teams
    ),
    now()
  );

  RETURN new_event_id;
END;
$$;

-- Update existing schedules to have 'active' status
UPDATE public.schedules SET status = 'active' WHERE status IS NULL;