-- ========================================
-- A) CLASS DEDUCTION SYSTEM (IDEMPOTENT)
-- ========================================

-- 1. Add credits_remaining column to existing player_memberships table
ALTER TABLE public.player_memberships 
ADD COLUMN IF NOT EXISTS credits_remaining integer;

-- 2. Initialize credits_remaining from allocated_classes_override or membership type
UPDATE public.player_memberships pm
SET credits_remaining = COALESCE(
  pm.allocated_classes_override,
  (SELECT mt.allocated_classes FROM public.membership_types mt WHERE mt.id = pm.membership_type_id),
  0
)
WHERE credits_remaining IS NULL;

-- 3. Set default and not null constraint
ALTER TABLE public.player_memberships 
ALTER COLUMN credits_remaining SET DEFAULT 0,
ALTER COLUMN credits_remaining SET NOT NULL;

-- 4. Membership ledger for tracking all credit changes
CREATE TABLE IF NOT EXISTS public.membership_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid,
  delta int NOT NULL,        -- -1 for attendance, +N for top-ups, etc.
  reason text NOT NULL,      -- 'attendance' | 'adjustment' | ...
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, event_id, reason)  -- prevents double-charging same event
);

-- 5. Trigger function to deduct credits when attendance is marked present
CREATE OR REPLACE FUNCTION public.trg_attendance_deduct_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  had_membership boolean;
BEGIN
  -- Only run when row is new or status changed to present
  IF (TG_OP = 'INSERT' AND NEW.status = 'present')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'present' AND OLD.status IS DISTINCT FROM 'present') THEN

    -- If we already logged a ledger line for this (player,event), bail (idempotent)
    IF EXISTS (SELECT 1 FROM public.membership_ledger
               WHERE player_id = NEW.player_id
                 AND event_id = NEW.event_id
                 AND reason = 'attendance') THEN
      RETURN NEW;
    END IF;

    -- Try to deduct 1 from any active membership with remaining credits
    UPDATE public.player_memberships
    SET credits_remaining = credits_remaining - 1,
        updated_at = now()
    WHERE player_id = NEW.player_id
      AND status = 'ACTIVE'
      AND (end_date IS NULL OR end_date >= now()::date)
      AND credits_remaining > 0
    RETURNING true INTO had_membership;

    -- Always write ledger (idempotent unique constraint prevents dupes)
    INSERT INTO public.membership_ledger(player_id, event_id, delta, reason)
    VALUES (NEW.player_id, NEW.event_id, -1, 'attendance')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Create trigger on attendance table
DROP TRIGGER IF EXISTS t_attendance_deduct_credit ON public.attendance;
CREATE TRIGGER t_attendance_deduct_credit
  AFTER INSERT OR UPDATE OF status ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.trg_attendance_deduct_credit();

-- 7. Views for UI summaries
CREATE OR REPLACE VIEW public.v_player_membership_usage AS
SELECT 
  pm.player_id,
  SUM(pm.credits_remaining) as credits_remaining,
  bool_or(pm.status = 'ACTIVE') as has_active_membership
FROM public.player_memberships pm
WHERE pm.status = 'ACTIVE'
GROUP BY pm.player_id;

CREATE OR REPLACE VIEW public.v_player_attendance_summary AS
SELECT 
  a.player_id,
  COUNT(*) FILTER (WHERE status='present') as present_count,
  COUNT(*) FILTER (WHERE status='late') as late_count,
  COUNT(*) FILTER (WHERE status='absent') as absent_count,
  COUNT(*) FILTER (WHERE status='excused') as excused_count
FROM public.attendance a
GROUP BY a.player_id;

-- ========================================
-- B) GRADING SYSTEM WITH REAL-TIME UPDATES
-- ========================================

-- 1. Grading metrics (rubric categories)
CREATE TABLE IF NOT EXISTS public.grading_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  weight numeric(5,2) NOT NULL DEFAULT 1.0,    -- weighting for overall
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Player grades header per (player,event)
CREATE TABLE IF NOT EXISTS public.player_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall numeric(5,2),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, player_id)
);

-- 3. Grade line items per metric
CREATE TABLE IF NOT EXISTS public.player_grade_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES public.player_grades(id) ON DELETE CASCADE,
  metric_id uuid NOT NULL REFERENCES public.grading_metrics(id),
  score numeric(5,2) NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grade_id, metric_id)
);

-- 4. Insert default grading metrics
INSERT INTO public.grading_metrics (name, weight) VALUES
  ('Shooting', 1.0),
  ('Ball Handling', 1.0),
  ('Passing', 1.0),
  ('Rebounding', 1.0),
  ('Footwork', 1.0),
  ('Decision Making', 1.0),
  ('Consistency', 1.0),
  ('Communication', 1.0)
ON CONFLICT (name) DO NOTHING;

-- 5. RPC to upsert player grades
CREATE OR REPLACE FUNCTION public.rpc_save_player_grades(
  p_event_id uuid,
  p_player_id uuid,
  p_items jsonb   -- [{ "metric_id": "...", "score": 7.5, "priority": "high" }, ...]
)
RETURNS table (overall numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade_id uuid;
  m record;
  total numeric := 0;
  total_w numeric := 0;
  w numeric;
  calc_overall numeric;
BEGIN
  IF p_event_id IS NULL OR p_player_id IS NULL THEN
    RAISE EXCEPTION 'event_id and player_id are required';
  END IF;

  -- Upsert header
  INSERT INTO public.player_grades(event_id, player_id, created_by)
  VALUES (p_event_id, p_player_id, auth.uid())
  ON CONFLICT (event_id, player_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_grade_id;

  -- Upsert items
  FOR m IN SELECT * FROM jsonb_to_recordset(p_items)
              AS x(metric_id uuid, score numeric, priority text)
  LOOP
    INSERT INTO public.player_grade_items(grade_id, metric_id, score, priority)
    VALUES (v_grade_id, m.metric_id, m.score, m.priority)
    ON CONFLICT (grade_id, metric_id) DO UPDATE
      SET score = EXCLUDED.score,
          priority = EXCLUDED.priority,
          updated_at = now();

    SELECT weight INTO w FROM public.grading_metrics WHERE id = m.metric_id;
    total   := total   + COALESCE(m.score,0) * COALESCE(w,1);
    total_w := total_w + COALESCE(w,1);
  END LOOP;

  -- Calculate overall (0–10 scale)
  calc_overall := CASE WHEN total_w > 0 THEN ROUND((total/total_w)::numeric, 2) ELSE NULL END;

  UPDATE public.player_grades SET overall = calc_overall, updated_at = now() WHERE id = v_grade_id;

  RETURN QUERY SELECT calc_overall;
END;
$$;

-- 6. View for latest player grades
CREATE OR REPLACE VIEW public.v_player_latest_grade AS
SELECT DISTINCT ON (player_id)
  player_id, 
  overall, 
  event_id, 
  updated_at
FROM public.player_grades
ORDER BY player_id, updated_at DESC;

-- ========================================
-- C) ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_grade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_metrics ENABLE ROW LEVEL SECURITY;

-- Ledger policies
CREATE POLICY "ledger_read_own" ON public.membership_ledger
FOR SELECT USING (
  player_id = auth.uid() OR 
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

CREATE POLICY "ledger_system_write" ON public.membership_ledger
FOR INSERT WITH CHECK (true); -- System can write via triggers

-- Grading policies
CREATE POLICY "grades_read_access" ON public.player_grades
FOR SELECT USING (
  player_id = auth.uid() OR 
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

CREATE POLICY "grades_write_access" ON public.player_grades
FOR ALL USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

CREATE POLICY "grade_items_read_access" ON public.player_grade_items
FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM public.player_grades g 
    WHERE g.id = grade_id AND (
      g.player_id = auth.uid() OR 
      is_super_admin(auth.uid()) OR 
      has_role(auth.uid(), 'coach'::user_role) OR 
      has_role(auth.uid(), 'staff'::user_role)
    )
  )
);

CREATE POLICY "grade_items_write_access" ON public.player_grade_items
FOR ALL USING (
  EXISTS(
    SELECT 1 FROM public.player_grades g 
    WHERE g.id = grade_id AND (
      is_super_admin(auth.uid()) OR 
      has_role(auth.uid(), 'coach'::user_role) OR 
      has_role(auth.uid(), 'staff'::user_role)
    )
  )
);

-- Metrics are readable by authenticated users
CREATE POLICY "metrics_read_all" ON public.grading_metrics
FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "metrics_manage_admin" ON public.grading_metrics
FOR ALL USING (is_super_admin(auth.uid()));

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_save_player_grades(uuid, uuid, jsonb) TO authenticated;

-- ========================================
-- D) ENABLE REALTIME
-- ========================================

-- Enable realtime for grading tables
ALTER TABLE public.player_grades REPLICA IDENTITY FULL;
ALTER TABLE public.player_grade_items REPLICA IDENTITY FULL;
ALTER TABLE public.player_memberships REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_grades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_grade_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_memberships;