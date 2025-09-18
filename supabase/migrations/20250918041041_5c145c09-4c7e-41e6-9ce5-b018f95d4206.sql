-- Comprehensive Attendance & Membership Fix (Final Version)
-- This migration addresses all schema conflicts and ambiguous references

-- Step 1: Drop and recreate RPC function with correct return type and constraint
DROP FUNCTION IF EXISTS public.rpc_save_attendance_batch(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.rpc_save_attendance_batch(p_event_id uuid, p_team_id uuid, p_entries jsonb)
RETURNS TABLE(player_id uuid, status text, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec JSONB;
  v_player UUID;
  v_status TEXT;
  v_notes TEXT;
BEGIN
  IF p_event_id IS NULL OR p_team_id IS NULL THEN
    RAISE EXCEPTION 'event_id and team_id are required';
  END IF;

  -- Authorization: caller must be coach/staff/super_admin
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role)) THEN
    RAISE EXCEPTION 'not authorized to record attendance';
  END IF;

  -- Process each entry - ONLY attendance, no membership logic
  FOR rec IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_player := (rec->>'player_id')::UUID;
    v_status := rec->>'status';
    v_notes  := rec->>'notes';

    IF v_player IS NULL OR v_status IS NULL THEN
      CONTINUE;
    END IF;

    -- Verify player belongs to team
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = v_player AND tm.team_id = p_team_id AND tm.is_active = true
    ) THEN
      RAISE EXCEPTION 'player % is not a member of team %', v_player, p_team_id;
    END IF;

    -- Upsert attendance only - trigger will handle membership
    INSERT INTO public.attendance(event_id, team_id, player_id, status, notes, recorded_by, recorded_at)
    VALUES (p_event_id, p_team_id, v_player, v_status, v_notes, auth.uid(), now())
    ON CONFLICT (event_id, player_id) DO UPDATE
      SET status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          recorded_by = EXCLUDED.recorded_by,
          recorded_at = EXCLUDED.recorded_at;

    RETURN QUERY SELECT v_player, v_status, true;
  END LOOP;
END;
$function$;

-- Step 2: Create single membership deduction trigger (replaces all other membership logic)
CREATE OR REPLACE FUNCTION public.handle_attendance_membership_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
  ledger_exists BOOLEAN;
BEGIN
  -- Get old and new status for comparison
  v_old_status := COALESCE(OLD.status, '');
  v_new_status := NEW.status;

  -- Handle INSERT or UPDATE to 'present'
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND v_new_status = 'present' AND v_old_status != 'present' THEN
    -- Check if already has ledger entry
    SELECT EXISTS(
      SELECT 1 FROM public.membership_ledger ml
      WHERE ml.player_id = NEW.player_id 
        AND ml.event_id = NEW.event_id 
        AND ml.reason = 'attendance'
    ) INTO ledger_exists;

    IF NOT ledger_exists THEN
      -- Deduct from active membership
      UPDATE public.player_memberships pm
      SET classes_used = pm.classes_used + 1,
          classes_remaining = pm.classes_remaining - 1,
          updated_at = now()
      WHERE pm.player_id = NEW.player_id 
        AND pm.status = 'ACTIVE' 
        AND pm.classes_remaining > 0;

      -- Log the deduction
      INSERT INTO public.membership_ledger(player_id, membership_id, event_id, delta, reason, created_at, created_by)
      SELECT NEW.player_id, pm.id, NEW.event_id, -1, 'attendance', now(), auth.uid()
      FROM public.player_memberships pm
      WHERE pm.player_id = NEW.player_id AND pm.status = 'ACTIVE'
      LIMIT 1;
    END IF;
  END IF;

  -- Handle UPDATE from 'present' to non-present (refund)
  IF TG_OP = 'UPDATE' AND v_old_status = 'present' AND v_new_status != 'present' THEN
    -- Check if has ledger entry to refund
    SELECT EXISTS(
      SELECT 1 FROM public.membership_ledger ml
      WHERE ml.player_id = NEW.player_id 
        AND ml.event_id = NEW.event_id 
        AND ml.reason = 'attendance'
    ) INTO ledger_exists;

    IF ledger_exists THEN
      -- Refund to active membership
      UPDATE public.player_memberships pm
      SET classes_used = pm.classes_used - 1,
          classes_remaining = pm.classes_remaining + 1,
          updated_at = now()
      WHERE pm.player_id = NEW.player_id 
        AND pm.status = 'ACTIVE'
        AND pm.classes_used > 0;

      -- Remove the ledger entry
      DELETE FROM public.membership_ledger
      WHERE player_id = NEW.player_id 
        AND event_id = NEW.event_id 
        AND reason = 'attendance';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_attendance_membership_sync ON public.attendance;
CREATE TRIGGER trg_attendance_membership_sync
  AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_attendance_membership_sync();

-- Step 3: Drop and recreate membership view with correct schema
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure;

CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  pm.id as membership_id,
  pm.player_id,
  pm.classes_total as allocated_classes,
  pm.classes_used as used_classes,
  pm.classes_remaining as remaining_classes,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN 
      (CURRENT_DATE - pm.end_date)
    WHEN pm.end_date IS NOT NULL THEN 
      (pm.end_date - CURRENT_DATE)
    ELSE NULL
  END as days_left,
  CASE 
    WHEN pm.classes_remaining <= 0 THEN true
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END as should_deactivate,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END as is_expired,
  pm.start_date,
  pm.end_date,
  p.full_name as player_name,
  pm.status,
  mt.name as membership_type_name,
  mt.allocation_type
FROM public.player_memberships pm
JOIN public.profiles p ON pm.player_id = p.id
JOIN public.membership_types mt ON pm.membership_type_id = mt.id
WHERE pm.status = 'ACTIVE'
ORDER BY pm.start_date DESC;

-- Step 4: Clean up unused/broken functions
DROP FUNCTION IF EXISTS public.fn_get_membership_summary(uuid);
DROP FUNCTION IF EXISTS public.fn_pick_active_membership(uuid);

-- Create new simplified membership summary function
CREATE OR REPLACE FUNCTION public.fn_get_membership_summary(target_player_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT row_to_json(summary)
  FROM (
    SELECT 
      membership_id,
      allocated_classes,
      used_classes,
      remaining_classes,
      status,
      membership_type_name as type,
      days_left,
      should_deactivate,
      is_expired,
      start_date,
      end_date,
      allocation_type
    FROM vw_player_membership_usage_secure 
    WHERE player_id = target_player_id
    ORDER BY start_date DESC
    LIMIT 1
  ) summary;
$function$;

-- Step 5: Create sample membership types for testing
INSERT INTO public.membership_types (name, allocation_type, allocated_classes, is_active, created_at, updated_at)
VALUES 
  ('Basic Package', 'CLASS_COUNT', 8, true, now(), now()),
  ('Premium Package', 'CLASS_COUNT', 16, true, now(), now()),
  ('Unlimited Monthly', 'UNLIMITED', NULL, true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- Step 6: Update existing RPC functions to use correct schema
CREATE OR REPLACE FUNCTION public.rpc_upsert_attendance(
  p_event_id uuid,
  p_team_id uuid,
  p_player_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Authorization check
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role)) THEN
    RAISE EXCEPTION 'not authorized to record attendance';
  END IF;

  -- Verify player belongs to team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = p_player_id AND tm.team_id = p_team_id AND tm.is_active = true
  ) THEN
    RAISE EXCEPTION 'player is not a member of this team';
  END IF;

  -- Upsert attendance (trigger will handle membership)
  INSERT INTO public.attendance(event_id, team_id, player_id, status, notes, recorded_by, recorded_at)
  VALUES (p_event_id, p_team_id, p_player_id, p_status, p_notes, auth.uid(), now())
  ON CONFLICT (event_id, player_id) DO UPDATE
    SET status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        recorded_by = EXCLUDED.recorded_by,
        recorded_at = EXCLUDED.recorded_at;

  -- Return success with membership update status
  SELECT json_build_object(
    'success', true,
    'status', p_status,
    'membership_updated', CASE WHEN p_status = 'present' THEN true ELSE false END
  ) INTO result;

  RETURN result;
END;
$function$;