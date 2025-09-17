-- Fix rpc_save_attendance_batch function to work with new schema
CREATE OR REPLACE FUNCTION public.rpc_save_attendance_batch(p_event_id uuid, p_team_id uuid, p_entries jsonb)
 RETURNS TABLE(player_id uuid, status text, credited boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec JSONB;
  v_player UUID;
  v_status TEXT;
  v_notes TEXT;
  already_counted BOOLEAN;
  had_credit BOOLEAN;
BEGIN
  IF p_event_id IS NULL OR p_team_id IS NULL THEN
    RAISE EXCEPTION 'event_id and team_id are required';
  END IF;

  -- Authorization: caller must be coach/staff/super_admin
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role)) THEN
    RAISE EXCEPTION 'not authorized to record attendance';
  END IF;

  -- Process each entry
  FOR rec IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_player := (rec->>'player_id')::UUID;
    v_status := rec->>'status';
    v_notes  := rec->>'notes';

    IF v_player IS NULL OR v_status IS NULL THEN
      CONTINUE;
    END IF;

    -- Verify player belongs to team using team_members table
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = v_player AND tm.team_id = p_team_id AND tm.is_active
    ) THEN
      RAISE EXCEPTION 'player % is not a member of team %', v_player, p_team_id;
    END IF;

    -- Upsert attendance
    INSERT INTO public.attendance(event_id, team_id, player_id, status, notes, recorded_by)
    VALUES (p_event_id, p_team_id, v_player, v_status, v_notes, auth.uid())
    ON CONFLICT (event_id, player_id) DO UPDATE
      SET status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          recorded_by = auth.uid(),
          recorded_at = now();

    -- Deduct membership credit if present
    credited := FALSE;
    IF v_status = 'present' THEN
      SELECT EXISTS(
        SELECT 1 FROM public.membership_ledger ml
        WHERE ml.player_id = v_player AND ml.event_id = p_event_id AND ml.reason = 'attendance'
      ) INTO already_counted;

      IF NOT already_counted THEN
        -- Use classes_used instead of credits_remaining and check classes_remaining > 0
        UPDATE public.player_memberships pm
        SET classes_used = pm.classes_used + 1,
            updated_at = now()
        WHERE pm.player_id = v_player 
          AND pm.is_active = TRUE 
          AND pm.classes_remaining > 0
        RETURNING TRUE INTO had_credit;

        INSERT INTO public.membership_ledger(player_id, event_id, delta, reason)
        VALUES (v_player, p_event_id, -1, 'attendance');

        credited := COALESCE(had_credit, FALSE);
      END IF;
    END IF;

    RETURN QUERY SELECT v_player, v_status, credited;
  END LOOP;
END;
$function$;