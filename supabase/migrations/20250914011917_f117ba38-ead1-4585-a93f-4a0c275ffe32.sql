-- Create the basic tables without problematic indexes first
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  team_id UUID NOT NULL,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.player_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create RPC function for saving attendance
CREATE OR REPLACE FUNCTION public.rpc_save_attendance_batch(
  p_event_id UUID,
  p_team_id UUID,
  p_entries JSONB
)
RETURNS TABLE (
  player_id UUID,
  status TEXT,
  credited BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT 1 FROM public.membership_ledger
        WHERE player_id = v_player AND event_id = p_event_id AND reason = 'attendance'
      ) INTO already_counted;

      IF NOT already_counted THEN
        UPDATE public.player_memberships
        SET credits_remaining = credits_remaining - 1,
            updated_at = now()
        WHERE player_id = v_player AND is_active = TRUE AND credits_remaining > 0
        RETURNING TRUE INTO had_credit;

        INSERT INTO public.membership_ledger(player_id, event_id, delta, reason)
        VALUES (v_player, p_event_id, -1, 'attendance');

        credited := COALESCE(had_credit, FALSE);
      END IF;
    END IF;

    RETURN QUERY SELECT v_player, v_status, credited;
  END LOOP;
END;
$$;