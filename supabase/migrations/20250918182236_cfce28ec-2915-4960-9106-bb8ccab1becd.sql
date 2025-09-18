-- Fix RPC functions to use override_class_count instead of allocated_classes_override

-- Drop and recreate rpc_assign_membership without allocated_classes references
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, boolean, text);

CREATE OR REPLACE FUNCTION public.rpc_assign_membership(
  p_player_id uuid,
  p_membership_type_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_override_class_count integer DEFAULT NULL,
  p_auto_deactivate_when_used_up boolean DEFAULT true,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
  v_default_count integer;
  v_remaining integer;
BEGIN
  -- Only super admins or staff can assign memberships
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;

  -- Get default class count from membership type
  SELECT COALESCE(class_count, 0) INTO v_default_count
  FROM membership_types
  WHERE id = p_membership_type_id;

  -- Calculate remaining classes: override or default
  v_remaining := COALESCE(p_override_class_count, v_default_count);

  -- Insert new membership
  INSERT INTO player_memberships (
    player_id,
    membership_type_id,
    start_date,
    end_date,
    override_class_count,
    remaining_classes,
    status,
    auto_deactivate_when_used_up,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_player_id,
    p_membership_type_id,
    p_start_date,
    p_end_date,
    p_override_class_count,
    v_remaining,
    'ACTIVE',
    p_auto_deactivate_when_used_up,
    p_notes,
    now(),
    now()
  ) RETURNING id INTO v_membership_id;

  -- Log the assignment
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    auth.uid(),
    'membership_assigned',
    jsonb_build_object(
      'player_id', p_player_id,
      'membership_type_id', p_membership_type_id,
      'membership_id', v_membership_id,
      'override_class_count', p_override_class_count,
      'remaining_classes', v_remaining
    ),
    now()
  );

  RETURN v_membership_id;
END;
$$;