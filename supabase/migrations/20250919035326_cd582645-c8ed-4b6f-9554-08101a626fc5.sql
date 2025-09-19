-- Simple migration to add canonical RPC function that works with current schema
CREATE OR REPLACE FUNCTION public.rpc_assign_membership(
  p_player_id uuid,
  p_membership_type_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_override_class_quota integer DEFAULT NULL,
  p_auto_deactivate_when_used_up boolean DEFAULT true,
  p_notes text DEFAULT NULL
) RETURNS public.player_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mt record;
  v_quota integer;
  rec public.player_memberships;
BEGIN
  SELECT * INTO mt FROM public.membership_types WHERE id = p_membership_type_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid membership_type_id or inactive';
  END IF;

  -- Determine quota based on type
  IF mt.allocation_type = 'CLASS_COUNT' THEN
    v_quota := COALESCE(p_override_class_quota, mt.allocated_classes, mt.class_count);
    IF v_quota IS NULL THEN
      RAISE EXCEPTION 'Please enter a class count or choose a type with a default quota.';
    END IF;
  ELSE
    v_quota := NULL; -- UNLIMITED
  END IF;

  INSERT INTO public.player_memberships(
    player_id, membership_type_id, start_date, end_date,
    classes_total, classes_used, auto_deactivate_when_used_up, status, notes, created_by,
    override_class_count
  )
  VALUES (
    p_player_id, p_membership_type_id, p_start_date, p_end_date,
    v_quota, 0, p_auto_deactivate_when_used_up, 'ACTIVE', p_notes, auth.uid(),
    p_override_class_quota
  )
  RETURNING * INTO rec;

  RETURN rec;
END $$;

-- Update the batch attendance RPC to use new signature
CREATE OR REPLACE FUNCTION public.rpc_save_attendance_batch(
  p_event_id uuid,
  p_records jsonb  -- array of {player_id, team_id, status, notes}
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_player uuid;
  v_team uuid;
  v_status text;
  v_notes text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_player := (r->>'player_id')::uuid;
    v_team   := (r->>'team_id')::uuid;
    v_status := r->>'status';
    v_notes  := r->>'notes';

    -- upsert attendance
    INSERT INTO public.attendance(event_id, player_id, team_id, status, notes, recorded_by)
    VALUES (p_event_id, v_player, v_team, v_status, v_notes, auth.uid())
    ON CONFLICT (event_id, player_id)
    DO UPDATE SET
      team_id = EXCLUDED.team_id,
      status  = EXCLUDED.status,
      notes   = EXCLUDED.notes,
      recorded_by = auth.uid(),
      recorded_at = now();
  END LOOP;
END $$;