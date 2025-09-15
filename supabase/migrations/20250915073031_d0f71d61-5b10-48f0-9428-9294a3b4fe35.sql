-- ===== PRODUCTION-READY ATTENDANCE + MEMBERSHIP + GRADING SYSTEM =====

-- A) ATTENDANCE TABLE (with proper relationships)
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE, 
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes text,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player ON public.attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_attendance_team ON public.attendance(team_id);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- B) PLAYER MEMBERSHIPS TABLE (class pack system)
CREATE TABLE IF NOT EXISTS public.player_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid, -- optional link to catalog
  classes_total int NOT NULL,
  classes_used int NOT NULL DEFAULT 0,
  classes_remaining int NOT NULL GENERATED ALWAYS AS (classes_total - classes_used) STORED,
  is_active boolean NOT NULL DEFAULT true,
  starts_at date,
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, id)
);

CREATE INDEX IF NOT EXISTS idx_pm_player_active ON public.player_memberships(player_id, is_active);

-- Enable RLS on player_memberships
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;

-- C) MEMBERSHIP LEDGER (prevents double-charge, supports refunds)
CREATE TABLE IF NOT EXISTS public.membership_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.player_memberships(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  delta int NOT NULL, -- -1 for use, +1 for refund
  reason text NOT NULL CHECK (reason IN ('attendance_present','attendance_refund','manual_adjust')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, membership_id, event_id, reason) -- ensures idempotency
);

CREATE INDEX IF NOT EXISTS idx_ml_player ON public.membership_ledger(player_id);

-- Enable RLS on membership_ledger
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;

-- D) EVENT PLAYER GRADES TABLE (persistent grading)
CREATE TABLE IF NOT EXISTS public.event_player_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- store scores as JSON: { shooting: 5, ball_handling: 4, defense: 5, iq: 4, athleticism: 5 }
  metrics jsonb NOT NULL,
  overall numeric NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_epg_event ON public.event_player_grades(event_id);
CREATE INDEX IF NOT EXISTS idx_epg_player ON public.event_player_grades(player_id);

-- Enable RLS on event_player_grades
ALTER TABLE public.event_player_grades ENABLE ROW LEVEL SECURITY;

-- E) HELPER FUNCTION: pick active membership to charge
CREATE OR REPLACE FUNCTION public.fn_pick_active_membership(p_player uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.player_memberships
  WHERE player_id = p_player AND is_active = true
    AND (expires_at IS NULL OR expires_at >= current_date)
    AND classes_remaining > 0
  ORDER BY COALESCE(expires_at, '9999-12-31'::date), classes_remaining DESC
  LIMIT 1;
$$;

-- F) STABLE ATTENDANCE UPSERT RPC
CREATE OR REPLACE FUNCTION public.rpc_upsert_attendance(
  p_event_id uuid,
  p_team_id uuid,
  p_player_id uuid,
  p_status text,
  p_notes text DEFAULT null
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.attendance(event_id, team_id, player_id, status, notes, recorded_by)
  VALUES (p_event_id, p_team_id, p_player_id, p_status, p_notes, auth.uid())
  ON CONFLICT (event_id, player_id) DO
  UPDATE SET 
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    recorded_by = auth.uid(),
    recorded_at = now();
$$;

-- G) MEMBERSHIP SYNC TRIGGER (automatic class usage)
CREATE OR REPLACE FUNCTION public.trg_attendance_membership_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership uuid;
  v_prev text;
  v_next text;
BEGIN
  v_prev := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE null END;
  v_next := NEW.status;

  -- If changing to PRESENT: charge once per event
  IF v_next = 'present' THEN
    v_membership := public.fn_pick_active_membership(NEW.player_id);
    IF v_membership IS NOT NULL THEN
      INSERT INTO public.membership_ledger(player_id, membership_id, event_id, delta, reason)
      VALUES (NEW.player_id, v_membership, NEW.event_id, -1, 'attendance_present')
      ON CONFLICT DO NOTHING;

      -- Apply the charge if we actually inserted the ledger row
      IF FOUND THEN
        UPDATE public.player_memberships
           SET classes_used = classes_used + 1
         WHERE id = v_membership;
      END IF;
    END IF;
  END IF;

  -- If switching away from PRESENT (absent/late/excused), refund exactly once
  IF v_prev = 'present' AND v_next <> 'present' THEN
    -- Which membership was charged? Prefer the same one via ledger lookup.
    SELECT membership_id INTO v_membership
    FROM public.membership_ledger
    WHERE player_id = NEW.player_id AND event_id = NEW.event_id
          AND reason = 'attendance_present'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_membership IS NOT NULL THEN
      INSERT INTO public.membership_ledger(player_id, membership_id, event_id, delta, reason)
      VALUES (NEW.player_id, v_membership, NEW.event_id, +1, 'attendance_refund')
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        UPDATE public.player_memberships
           SET classes_used = GREATEST(classes_used - 1, 0)
         WHERE id = v_membership;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure clean state
DROP TRIGGER IF EXISTS trg_attendance_membership_sync ON public.attendance;
CREATE TRIGGER trg_attendance_membership_sync
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.trg_attendance_membership_sync();

-- H) GRADING SAVE RPC
CREATE OR REPLACE FUNCTION public.rpc_save_event_grades(
  p_event_id uuid,
  p_player_id uuid,
  p_metrics jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overall numeric;
BEGIN
  -- compute overall = average of provided numeric values
  SELECT avg((value)::numeric)
    INTO v_overall
  FROM jsonb_each_text(p_metrics);

  INSERT INTO public.event_player_grades(event_id, player_id, metrics, overall, created_by)
  VALUES (p_event_id, p_player_id, p_metrics, COALESCE(v_overall,0), auth.uid())
  ON CONFLICT (event_id, player_id) DO UPDATE
    SET metrics = EXCLUDED.metrics,
        overall = EXCLUDED.overall,
        created_by = auth.uid(),
        updated_at = now();
END;
$$;

-- I) LATEST GRADE VIEW (for profile cards)
CREATE OR REPLACE VIEW public.v_player_latest_grade AS
SELECT DISTINCT ON (player_id)
  player_id, metrics, overall, updated_at
FROM public.event_player_grades
ORDER BY player_id, updated_at DESC;

-- J) RLS POLICIES

-- Attendance RLS
CREATE POLICY "Staff and coaches can manage attendance" ON public.attendance
FOR ALL USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role)
);

CREATE POLICY "Players can view own attendance" ON public.attendance
FOR SELECT USING (player_id = auth.uid());

-- Player memberships RLS
CREATE POLICY "Staff and admins can manage memberships" ON public.player_memberships
FOR ALL USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

CREATE POLICY "Players can view own memberships" ON public.player_memberships
FOR SELECT USING (player_id = auth.uid());

-- Membership ledger RLS
CREATE POLICY "Staff and admins can manage ledger" ON public.membership_ledger
FOR ALL USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

CREATE POLICY "Players can view own ledger" ON public.membership_ledger
FOR SELECT USING (player_id = auth.uid());

-- Event player grades RLS
CREATE POLICY "Staff and coaches can manage grades" ON public.event_player_grades
FOR ALL USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role)
);

CREATE POLICY "Players can view own grades" ON public.event_player_grades
FOR SELECT USING (player_id = auth.uid());

-- K) FUNCTION PERMISSIONS
REVOKE ALL ON FUNCTION public.rpc_upsert_attendance(uuid,uuid,uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_attendance(uuid,uuid,uuid,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_save_event_grades(uuid,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_save_event_grades(uuid,uuid,jsonb) TO authenticated;

-- L) ENABLE REALTIME FOR TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_player_grades;