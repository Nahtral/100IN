-- ===== PRODUCTION-READY ATTENDANCE + MEMBERSHIP + GRADING SYSTEM (FIXED) =====

-- A) DROP DEPENDENT VIEW TEMPORARILY
DROP VIEW IF EXISTS public.v_player_membership_usage;
DROP VIEW IF EXISTS public.v_player_membership_usage_secure;

-- B) UPDATE MEMBERSHIP LEDGER to link to player_memberships
ALTER TABLE public.membership_ledger 
ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.player_memberships(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ml_membership ON public.membership_ledger(membership_id);

-- C) ADD COMPUTED COLUMNS TO EXISTING PLAYER MEMBERSHIPS
-- Add the missing columns we need for the class pack system
DO $$
BEGIN
  -- Check if we need to add classes_total column (use allocated_classes_override or default)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_memberships' AND column_name = 'classes_total') THEN
    ALTER TABLE public.player_memberships ADD COLUMN classes_total int;
    -- Initialize from allocated_classes_override or membership type
    UPDATE public.player_memberships 
    SET classes_total = COALESCE(allocated_classes_override, 10) -- default 10 classes
    WHERE classes_total IS NULL;
    
    ALTER TABLE public.player_memberships ALTER COLUMN classes_total SET NOT NULL;
  END IF;

  -- Add classes_used column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_memberships' AND column_name = 'classes_used') THEN
    ALTER TABLE public.player_memberships ADD COLUMN classes_used int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Update credits_remaining to be computed from classes_total - classes_used
ALTER TABLE public.player_memberships DROP COLUMN IF EXISTS credits_remaining CASCADE;
ALTER TABLE public.player_memberships 
ADD COLUMN classes_remaining int GENERATED ALWAYS AS (classes_total - classes_used) STORED;

-- D) RECREATE VIEW WITH NEW SCHEMA
CREATE OR REPLACE VIEW public.v_player_membership_usage_secure AS
SELECT 
    pm.id as membership_id,
    pm.player_id,
    p.full_name as player_name,
    pm.classes_total as allocated_classes,
    pm.classes_used as used_classes,
    pm.classes_remaining as remaining_classes,
    pm.status,
    mt.name as membership_type_name,
    CASE 
        WHEN pm.end_date IS NOT NULL THEN (pm.end_date - CURRENT_DATE) 
        ELSE NULL 
    END as days_left,
    CASE 
        WHEN pm.classes_remaining <= 0 OR (pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE) 
        THEN true 
        ELSE false 
    END as should_deactivate,
    CASE 
        WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE 
        THEN true 
        ELSE false 
    END as is_expired,
    pm.start_date,
    pm.end_date,
    'CLASS_COUNT' as allocation_type
FROM public.player_memberships pm
LEFT JOIN public.profiles p ON pm.player_id = p.id  
LEFT JOIN public.membership_types mt ON pm.membership_type_id = mt.id
WHERE pm.status = 'ACTIVE';

-- Enable RLS on the view
ALTER VIEW public.v_player_membership_usage_secure OWNER TO postgres;

-- E) HELPER FUNCTION: pick active membership to charge (adapted for existing schema)
CREATE OR REPLACE FUNCTION public.fn_pick_active_membership(p_player uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.player_memberships
  WHERE player_id = p_player 
    AND status = 'ACTIVE'
    AND (end_date IS NULL OR end_date >= current_date)
    AND classes_remaining > 0
  ORDER BY COALESCE(end_date, '9999-12-31'::date), classes_remaining DESC
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

-- G) MEMBERSHIP SYNC TRIGGER (automatic class usage) - adapted for existing schema
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

-- H) GRADING SAVE RPC (adapted for existing schema with individual skill columns)
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
  v_shooting int := (p_metrics->>'shooting')::int;
  v_ball_handling int := (p_metrics->>'ball_handling')::int;
  v_passing int := (p_metrics->>'passing')::int;
  v_rebounding int := (p_metrics->>'rebounding')::int;
  v_footwork int := (p_metrics->>'footwork')::int;
  v_decision_making int := (p_metrics->>'decision_making')::int;
  v_consistency int := (p_metrics->>'consistency')::int;
  v_communication int := (p_metrics->>'communication')::int;
  v_cutting int := (p_metrics->>'cutting')::int;
  v_teammate_support int := (p_metrics->>'teammate_support')::int;
  v_competitiveness int := (p_metrics->>'competitiveness')::int;
  v_coachable int := (p_metrics->>'coachable')::int;
  v_leadership int := (p_metrics->>'leadership')::int;
  v_reaction_time int := (p_metrics->>'reaction_time')::int;
  v_game_iq int := (p_metrics->>'game_iq')::int;
  v_boxout_frequency int := (p_metrics->>'boxout_frequency')::int;
  v_court_vision int := (p_metrics->>'court_vision')::int;
BEGIN
  -- Compute overall as average of provided values
  SELECT avg(val::numeric)
  INTO v_overall
  FROM (SELECT value::numeric as val FROM jsonb_each_text(p_metrics) WHERE value ~ '^\d+(\.\d+)?$') subq;

  INSERT INTO public.event_player_grades(
    schedule_id, player_id, graded_by, 
    shooting, ball_handling, passing, rebounding, footwork,
    decision_making, consistency, communication, cutting, teammate_support,
    competitiveness, coachable, leadership, reaction_time, game_iq,
    boxout_frequency, court_vision, overall_grade, event_type
  )
  VALUES (
    p_event_id, p_player_id, auth.uid(),
    v_shooting, v_ball_handling, v_passing, v_rebounding, v_footwork,
    v_decision_making, v_consistency, v_communication, v_cutting, v_teammate_support,
    v_competitiveness, v_coachable, v_leadership, v_reaction_time, v_game_iq,
    v_boxout_frequency, v_court_vision, COALESCE(v_overall,0), 'practice'
  )
  ON CONFLICT (schedule_id, player_id) DO UPDATE
    SET 
      shooting = EXCLUDED.shooting,
      ball_handling = EXCLUDED.ball_handling,
      passing = EXCLUDED.passing,
      rebounding = EXCLUDED.rebounding,
      footwork = EXCLUDED.footwork,
      decision_making = EXCLUDED.decision_making,
      consistency = EXCLUDED.consistency,
      communication = EXCLUDED.communication,
      cutting = EXCLUDED.cutting,
      teammate_support = EXCLUDED.teammate_support,
      competitiveness = EXCLUDED.competitiveness,
      coachable = EXCLUDED.coachable,
      leadership = EXCLUDED.leadership,
      reaction_time = EXCLUDED.reaction_time,
      game_iq = EXCLUDED.game_iq,
      boxout_frequency = EXCLUDED.boxout_frequency,
      court_vision = EXCLUDED.court_vision,
      overall_grade = EXCLUDED.overall_grade,
      graded_by = auth.uid(),
      updated_at = now();
END;
$$;

-- I) ADD CONSTRAINT TO MEMBERSHIP LEDGER FOR IDEMPOTENCY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_membership_ledger_entry' 
    AND table_name = 'membership_ledger'
  ) THEN
    ALTER TABLE public.membership_ledger 
    ADD CONSTRAINT unique_membership_ledger_entry 
    UNIQUE (player_id, membership_id, event_id, reason);
  END IF;
END $$;

-- J) FUNCTION PERMISSIONS
REVOKE ALL ON FUNCTION public.rpc_upsert_attendance(uuid,uuid,uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_attendance(uuid,uuid,uuid,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_save_event_grades(uuid,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_save_event_grades(uuid,uuid,jsonb) TO authenticated;