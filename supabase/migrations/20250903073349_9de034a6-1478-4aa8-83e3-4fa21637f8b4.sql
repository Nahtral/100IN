-- Find and fix remaining security definer views
-- Check for any other views that might have SECURITY DEFINER

-- First, let me check what might be causing the issue
-- Drop the rpc_duplicate_event function and recreate with proper search path
DROP FUNCTION IF EXISTS public.rpc_duplicate_event CASCADE;

CREATE OR REPLACE FUNCTION public.rpc_duplicate_event(
  event_id UUID,
  shift_days INTEGER DEFAULT 0,
  copy_teams BOOLEAN DEFAULT true,
  new_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  original_event RECORD;
  new_event_id UUID;
  shifted_start_time TIMESTAMP WITH TIME ZONE;
  shifted_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only super admins can duplicate events
  IF NOT public.is_super_admin(auth.uid()) THEN
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