-- 1. SAFE DROPS (idempotent)
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, text) CASCADE;

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE membership_kind AS ENUM ('CLASS_COUNT','UNLIMITED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active','expired','depleted','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. MASTER TYPES (catalog) - Update existing table
ALTER TABLE public.membership_types 
ADD COLUMN IF NOT EXISTS kind membership_kind NOT NULL DEFAULT 'CLASS_COUNT';

ALTER TABLE public.membership_types 
ADD COLUMN IF NOT EXISTS class_quota integer;

-- Update existing records to have proper kind and class_quota
UPDATE public.membership_types 
SET kind = 'CLASS_COUNT', 
    class_quota = COALESCE(allocated_classes, 10)
WHERE kind IS NULL OR class_quota IS NULL;

-- 4. PLAYER MEMBERSHIPS - Update existing table
ALTER TABLE public.player_memberships 
ADD COLUMN IF NOT EXISTS class_quota integer;

ALTER TABLE public.player_memberships 
ADD COLUMN IF NOT EXISTS classes_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.player_memberships 
ADD COLUMN IF NOT EXISTS status membership_status NOT NULL DEFAULT 'active';

-- Migrate existing data
UPDATE public.player_memberships 
SET class_quota = COALESCE(classes_total, 10),
    classes_used = COALESCE(classes_used, 0),
    status = CASE 
      WHEN COALESCE(classes_used, 0) >= COALESCE(classes_total, 10) THEN 'depleted'::membership_status
      WHEN end_date IS NOT NULL AND end_date < CURRENT_DATE THEN 'expired'::membership_status
      ELSE 'active'::membership_status
    END
WHERE class_quota IS NULL OR status IS NULL;

-- 5. COMPUTED VIEW
DROP VIEW IF EXISTS public.v_player_memberships CASCADE;
CREATE VIEW public.v_player_memberships AS
SELECT
  pm.*,
  GREATEST(COALESCE(pm.class_quota, 0) - pm.classes_used, 0) AS remaining_classes
FROM public.player_memberships pm;

-- 6. ATTENDANCE UNIQUENESS
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_unique;

ALTER TABLE public.attendance
ADD CONSTRAINT attendance_unique UNIQUE (event_id, player_id);

-- 7. MEMBERSHIP USAGE LEDGER for idempotent tracking
CREATE TABLE IF NOT EXISTS public.membership_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_membership_id uuid NOT NULL REFERENCES public.player_memberships(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  classes_deducted integer NOT NULL DEFAULT 1,
  deducted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_membership_id, event_id)
);

-- RLS for membership_ledger
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ledger_super_admin_all ON public.membership_ledger;
CREATE POLICY ledger_super_admin_all ON public.membership_ledger
FOR ALL USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS ledger_staff_view ON public.membership_ledger;
CREATE POLICY ledger_staff_view ON public.membership_ledger
FOR SELECT USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

-- 8. TRIGGERS
CREATE OR REPLACE FUNCTION public.fn_refresh_membership_status() 
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
  -- expire by date
  IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  END IF;

  -- deplete when quota reached (only for CLASS_COUNT)
  IF NEW.class_quota IS NOT NULL AND NEW.classes_used >= NEW.class_quota THEN
    NEW.status := 'depleted';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_refresh_membership_status ON public.player_memberships;
CREATE TRIGGER trg_refresh_membership_status
BEFORE INSERT OR UPDATE ON public.player_memberships
FOR EACH ROW EXECUTE PROCEDURE public.fn_refresh_membership_status();

-- 9. HELPER FUNCTION: get active class membership
CREATE OR REPLACE FUNCTION public.fn_get_active_class_membership(p_player_id uuid, p_on date)
RETURNS public.player_memberships
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.*
  FROM public.player_memberships pm
  JOIN public.membership_types mt ON mt.id = pm.membership_type_id
  WHERE pm.player_id = p_player_id
    AND pm.status = 'active'
    AND (pm.start_date <= p_on)
    AND (pm.end_date IS NULL OR pm.end_date >= p_on)
    AND mt.kind = 'CLASS_COUNT'
  ORDER BY pm.created_at DESC
  LIMIT 1
$$;

-- 10. ATTENDANCE CHANGE TRIGGER (idempotent via ledger)
CREATE OR REPLACE FUNCTION public.fn_on_attendance_change() 
RETURNS TRIGGER
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mem public.player_memberships;
  v_event_date date;
BEGIN
  -- Only care if present, and status changed from non-present to present
  IF (TG_OP = 'INSERT' AND NEW.status = 'present')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'present' AND COALESCE(OLD.status,'') <> 'present') THEN

    SELECT date(start_time) INTO v_event_date
    FROM public.schedules WHERE id = NEW.event_id;

    mem := public.fn_get_active_class_membership(NEW.player_id, COALESCE(v_event_date, CURRENT_DATE));

    IF mem.id IS NOT NULL AND mem.class_quota IS NOT NULL AND mem.classes_used < mem.class_quota THEN
      -- Use ledger for idempotent deduction
      INSERT INTO public.membership_ledger (player_membership_id, event_id, player_id, classes_deducted)
      VALUES (mem.id, NEW.event_id, NEW.player_id, 1)
      ON CONFLICT (player_membership_id, event_id) DO NOTHING;

      -- Update classes_used based on ledger
      UPDATE public.player_memberships
      SET classes_used = (
        SELECT COALESCE(SUM(classes_deducted), 0)
        FROM public.membership_ledger
        WHERE player_membership_id = mem.id
      ),
      updated_at = now()
      WHERE id = mem.id;

      -- Auto-deactivate when used up
      IF (SELECT classes_used FROM public.player_memberships WHERE id = mem.id) >=
         (SELECT class_quota FROM public.player_memberships WHERE id = mem.id)
         AND mem.auto_deactivate_when_used_up THEN
        UPDATE public.player_memberships SET status = 'depleted' WHERE id = mem.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_attendance_change ON public.attendance;
CREATE TRIGGER trg_on_attendance_change
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE PROCEDURE public.fn_on_attendance_change();

-- 11. CANONICAL RPC: assign membership (single signature)
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

  IF mt.kind = 'CLASS_COUNT' THEN
    v_quota := COALESCE(p_override_class_quota, mt.class_quota);
    IF v_quota IS NULL THEN
      RAISE EXCEPTION 'class_quota must be provided for CLASS_COUNT memberships';
    END IF;
  ELSE
    v_quota := NULL; -- UNLIMITED
  END IF;

  INSERT INTO public.player_memberships(
    player_id, membership_type_id, start_date, end_date,
    class_quota, classes_used, auto_deactivate_when_used_up, status, notes
  )
  VALUES (
    p_player_id, p_membership_type_id, p_start_date, p_end_date,
    v_quota, 0, p_auto_deactivate_when_used_up, 'active', p_notes
  )
  RETURNING * INTO rec;

  RETURN rec;
END $$;

-- 12. BATCH ATTENDANCE RPC (new signature)
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

    -- upsert attendance; force column qualification to avoid ambiguity
    INSERT INTO public.attendance(event_id, player_id, team_id, status, notes)
    VALUES (p_event_id, v_player, v_team, v_status, v_notes)
    ON CONFLICT (event_id, player_id)
    DO UPDATE SET
      team_id = EXCLUDED.team_id,
      status  = EXCLUDED.status,
      notes   = EXCLUDED.notes,
      recorded_by = auth.uid(),
      recorded_at = now();
  END LOOP;
END $$;

-- 13. BACKWARD COMPATIBILITY VIEWS
DROP VIEW IF EXISTS public.membership_types_v CASCADE;
CREATE VIEW public.membership_types_v AS
SELECT 
  id,
  name,
  kind AS allocation_type,
  class_quota AS allocated_classes,
  is_active,
  created_at,
  updated_at
FROM public.membership_types;

DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;
CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  pm.id AS membership_id,
  pm.player_id,
  pm.class_quota AS allocated_classes,
  pm.classes_used AS used_classes,
  GREATEST(COALESCE(pm.class_quota, 0) - pm.classes_used, 0) AS remaining_classes,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN EXTRACT(days FROM pm.end_date - CURRENT_DATE)::integer
    ELSE NULL
  END AS days_left,
  CASE 
    WHEN pm.status = 'depleted' OR (pm.class_quota IS NOT NULL AND pm.classes_used >= pm.class_quota) THEN true
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END AS should_deactivate,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END AS is_expired,
  pm.start_date,
  pm.end_date,
  p.full_name AS player_name,
  pm.status,
  mt.name AS membership_type_name,
  mt.kind AS allocation_type
FROM public.player_memberships pm
JOIN public.players pl ON pl.id = pm.player_id
JOIN public.profiles p ON p.id = pl.user_id
JOIN public.membership_types mt ON mt.id = pm.membership_type_id;

-- 14. RLS POLICIES
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;

-- membership_types: read for approved users
DROP POLICY IF EXISTS mt_read_all ON public.membership_types;
CREATE POLICY mt_read_all ON public.membership_types
FOR SELECT USING (true);

DROP POLICY IF EXISTS mt_super_admin_all ON public.membership_types;
CREATE POLICY mt_super_admin_all ON public.membership_types
FOR ALL USING (is_super_admin(auth.uid()));

-- player_memberships: super_admin full; staff/coach manage; player read own
DROP POLICY IF EXISTS pm_super_admin_all ON public.player_memberships;
CREATE POLICY pm_super_admin_all ON public.player_memberships
FOR ALL USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS pm_staff_manage ON public.player_memberships;
CREATE POLICY pm_staff_manage ON public.player_memberships
FOR SELECT USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS pm_staff_write ON public.player_memberships;
CREATE POLICY pm_staff_write ON public.player_memberships
FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS pm_staff_update ON public.player_memberships;
CREATE POLICY pm_staff_update ON public.player_memberships
FOR UPDATE USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS pm_player_read_own ON public.player_memberships;
CREATE POLICY pm_player_read_own ON public.player_memberships
FOR SELECT USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_memberships.player_id AND p.user_id = auth.uid()));