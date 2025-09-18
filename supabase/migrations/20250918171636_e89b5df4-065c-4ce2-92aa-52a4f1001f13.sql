-- Drop existing conflicting functions first
DROP FUNCTION IF EXISTS public.fn_pick_active_membership(uuid);

-- Step 1: Create new attendance table with proper structure
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes text,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player ON public.attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- Step 2: Create membership ledger table for tracking deductions/refunds
CREATE TABLE IF NOT EXISTS public.membership_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  membership_id uuid NOT NULL REFERENCES public.player_memberships(id),
  event_id uuid NOT NULL REFERENCES public.schedules(id),
  delta int NOT NULL,  -- -1 charge, +1 refund
  reason text NOT NULL CHECK (reason IN ('attendance_present','attendance_refund','manual_adjust')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, membership_id, event_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_membership_ledger_player ON public.membership_ledger(player_id);
CREATE INDEX IF NOT EXISTS idx_membership_ledger_membership ON public.membership_ledger(membership_id);

-- Step 3: Function to pick active membership for a player
CREATE OR REPLACE FUNCTION public.fn_pick_active_membership(p_player uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id
  FROM public.player_memberships
  WHERE player_id = p_player 
    AND status = 'ACTIVE'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND allocated_classes > used_classes
  ORDER BY COALESCE(end_date, '9999-12-31'::date), (allocated_classes - used_classes) DESC
  LIMIT 1;
$$;

-- Step 4: Trigger function for membership sync
CREATE OR REPLACE FUNCTION public.trg_attendance_membership_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_membership uuid;
  v_prev text;
  v_next text;
BEGIN
  v_prev := CASE WHEN tg_op = 'UPDATE' THEN old.status ELSE null END;
  v_next := new.status;

  -- Handle attendance marked as present (deduct class)
  IF v_next = 'present' THEN
    v_membership := public.fn_pick_active_membership(new.player_id);
    IF v_membership IS NOT NULL THEN
      INSERT INTO public.membership_ledger(player_id, membership_id, event_id, delta, reason)
      VALUES (new.player_id, v_membership, new.event_id, -1, 'attendance_present')
      ON CONFLICT (player_id, membership_id, event_id, reason) DO NOTHING;
      
      IF FOUND THEN
        UPDATE public.player_memberships
        SET used_classes = used_classes + 1,
            updated_at = now()
        WHERE id = v_membership;
      END IF;
    END IF;
  END IF;

  -- Handle attendance changed from present to something else (refund class)
  IF v_prev = 'present' AND v_next <> 'present' THEN
    SELECT membership_id INTO v_membership
    FROM public.membership_ledger
    WHERE player_id = new.player_id 
      AND event_id = new.event_id
      AND reason = 'attendance_present'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_membership IS NOT NULL THEN
      INSERT INTO public.membership_ledger(player_id, membership_id, event_id, delta, reason)
      VALUES (new.player_id, v_membership, new.event_id, +1, 'attendance_refund')
      ON CONFLICT (player_id, membership_id, event_id, reason) DO NOTHING;
      
      IF FOUND THEN
        UPDATE public.player_memberships
        SET used_classes = GREATEST(used_classes - 1, 0),
            updated_at = now()
        WHERE id = v_membership;
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- Step 5: Create trigger for attendance membership sync
DROP TRIGGER IF EXISTS trg_attendance_membership_sync ON public.attendance;
CREATE TRIGGER trg_attendance_membership_sync
  AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.trg_attendance_membership_sync();

-- Step 6: Create hardened batch save RPC
CREATE OR REPLACE FUNCTION public.rpc_save_attendance_batch(p_records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.attendance AS a (
    event_id, team_id, player_id, status, notes, recorded_by
  )
  SELECT
    (rec->>'event_id')::uuid,
    NULLIF(rec->>'team_id','')::uuid,
    (rec->>'player_id')::uuid,
    (rec->>'status')::text,
    NULLIF(rec->>'notes',''),
    auth.uid()
  FROM jsonb_array_elements(p_records) rec
  ON CONFLICT (event_id, player_id)
  DO UPDATE SET 
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    team_id = EXCLUDED.team_id,
    recorded_by = auth.uid(),
    recorded_at = now()
  WHERE a.event_id = EXCLUDED.event_id
    AND a.player_id = EXCLUDED.player_id;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.rpc_save_attendance_batch(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_save_attendance_batch(jsonb) TO authenticated;

-- Step 7: RLS Policies for attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view attendance for events they have access to
CREATE POLICY "attendance_view_policy" ON public.attendance
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Super admin can see all
      is_super_admin(auth.uid()) OR
      -- Staff can see all
      has_role(auth.uid(), 'staff'::user_role) OR
      -- Coaches can see all
      has_role(auth.uid(), 'coach'::user_role) OR
      -- Players can see their own
      player_id = auth.uid() OR
      -- Parents can see their children's attendance
      EXISTS (
        SELECT 1 FROM parent_child_relationships pcr 
        WHERE pcr.parent_id = auth.uid() AND pcr.child_id = attendance.player_id
      )
    )
  );

-- Policy: Allow authorized users to manage attendance
CREATE POLICY "attendance_manage_policy" ON public.attendance
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin(auth.uid()) OR
      has_role(auth.uid(), 'staff'::user_role) OR
      has_role(auth.uid(), 'coach'::user_role)
    )
  );

-- Step 8: RLS Policies for membership ledger
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_ledger_view_policy" ON public.membership_ledger
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin(auth.uid()) OR
      has_role(auth.uid(), 'staff'::user_role) OR
      player_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM parent_child_relationships pcr 
        WHERE pcr.parent_id = auth.uid() AND pcr.child_id = membership_ledger.player_id
      )
    )
  );

CREATE POLICY "membership_ledger_manage_policy" ON public.membership_ledger
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin(auth.uid()) OR
      has_role(auth.uid(), 'staff'::user_role)
    )
  );

-- Step 9: Disable writes to legacy player_attendance table (keep for read-only temporarily)
REVOKE INSERT, UPDATE, DELETE ON public.player_attendance FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_attendance FROM public;