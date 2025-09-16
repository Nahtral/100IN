-- Production Hardening Migration: Attendance, Membership, Onboarding, Grading
-- This migration creates a robust, idempotent system for all core operations

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.fn_pick_active_membership(uuid) CASCADE;

-- 1. ATTENDANCE SYSTEM
-- Drop existing attendance table if it exists and recreate with proper schema
DROP TABLE IF EXISTS public.attendance CASCADE;

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance
CREATE POLICY "Coaches and staff can manage attendance" ON public.attendance
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    has_role(auth.uid(), 'staff'::user_role)
  );

CREATE POLICY "Players can view their own attendance" ON public.attendance
  FOR SELECT USING (player_id = auth.uid());

-- 2. MEMBERSHIP SYSTEM
-- Recreate player_memberships with proper schema
DROP TABLE IF EXISTS public.player_memberships CASCADE;
DROP TABLE IF EXISTS public.membership_ledger CASCADE;

CREATE TABLE public.player_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
  classes_total INTEGER NOT NULL DEFAULT 0,
  classes_used INTEGER NOT NULL DEFAULT 0,
  classes_remaining INTEGER GENERATED ALWAYS AS (classes_total - classes_used) STORED,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
  auto_deactivate_when_used_up BOOLEAN NOT NULL DEFAULT true,
  manual_override_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Membership ledger for tracking all class usage
CREATE TABLE public.membership_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.player_memberships(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL, -- +1 for refund, -1 for usage
  reason TEXT NOT NULL CHECK (reason IN ('attendance', 'manual_adjustment', 'refund')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (player_id, membership_id, event_id, reason)
);

-- Enable RLS
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for memberships
CREATE POLICY "Players can view their own memberships" ON public.player_memberships
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Staff can manage all memberships" ON public.player_memberships
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    has_role(auth.uid(), 'staff'::user_role)
  );

CREATE POLICY "Players can view their own ledger" ON public.membership_ledger
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Staff can manage all ledger entries" ON public.membership_ledger
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    has_role(auth.uid(), 'staff'::user_role)
  );

-- 3. GRADING SYSTEM
-- Create event player grades table
DROP TABLE IF EXISTS public.event_player_grades CASCADE;

CREATE TABLE public.event_player_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL DEFAULT '{}',
  overall NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);

-- Enable RLS
ALTER TABLE public.event_player_grades ENABLE ROW LEVEL SECURITY;

-- RLS policies for grades
CREATE POLICY "Players can view their own grades" ON public.event_player_grades
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Coaches and staff can manage grades" ON public.event_player_grades
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    has_role(auth.uid(), 'staff'::user_role)
  );

-- 4. HELPER FUNCTIONS

-- Function to pick active membership for a player
CREATE OR REPLACE FUNCTION public.fn_pick_active_membership(p_player_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_id UUID;
BEGIN
  SELECT id INTO membership_id
  FROM public.player_memberships
  WHERE player_id = p_player_id
    AND status = 'ACTIVE'
    AND classes_remaining > 0
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY 
    CASE WHEN end_date IS NULL THEN '9999-12-31'::DATE ELSE end_date END ASC,
    created_at ASC
  LIMIT 1;
  
  RETURN membership_id;
END;
$$;

-- 5. CORE RPC FUNCTIONS

-- Idempotent attendance upsert
CREATE OR REPLACE FUNCTION public.rpc_upsert_attendance(
  p_event_id UUID,
  p_team_id UUID,
  p_player_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status TEXT;
  membership_id UUID;
  ledger_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_event_id IS NULL OR p_team_id IS NULL OR p_player_id IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  -- Check authorization
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'coach'::user_role) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Unauthorized to record attendance';
  END IF;

  -- Get old status if exists
  SELECT status INTO old_status
  FROM public.attendance
  WHERE event_id = p_event_id AND player_id = p_player_id;

  -- Upsert attendance record
  INSERT INTO public.attendance (event_id, team_id, player_id, status, notes, recorded_by)
  VALUES (p_event_id, p_team_id, p_player_id, p_status, p_notes, auth.uid())
  ON CONFLICT (event_id, player_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    recorded_by = auth.uid(),
    recorded_at = now();

  -- Handle membership deduction/refund
  IF p_status = 'present' AND (old_status IS NULL OR old_status != 'present') THEN
    -- Deduct a class
    membership_id := fn_pick_active_membership(p_player_id);
    
    IF membership_id IS NOT NULL THEN
      -- Check if already recorded
      SELECT EXISTS(
        SELECT 1 FROM public.membership_ledger
        WHERE player_id = p_player_id 
          AND membership_id = membership_id 
          AND event_id = p_event_id 
          AND reason = 'attendance'
      ) INTO ledger_exists;

      IF NOT ledger_exists THEN
        -- Update membership
        UPDATE public.player_memberships
        SET classes_used = classes_used + 1,
            updated_at = now()
        WHERE id = membership_id AND classes_remaining > 0;

        -- Record in ledger
        INSERT INTO public.membership_ledger (player_id, membership_id, event_id, delta, reason, created_by)
        VALUES (p_player_id, membership_id, p_event_id, -1, 'attendance', auth.uid());
      END IF;
    END IF;

  ELSIF old_status = 'present' AND p_status != 'present' THEN
    -- Refund a class
    SELECT ml.membership_id INTO membership_id
    FROM public.membership_ledger ml
    WHERE ml.player_id = p_player_id 
      AND ml.event_id = p_event_id 
      AND ml.reason = 'attendance'
      AND ml.delta = -1
    LIMIT 1;

    IF membership_id IS NOT NULL THEN
      -- Update membership
      UPDATE public.player_memberships
      SET classes_used = classes_used - 1,
          updated_at = now()
      WHERE id = membership_id;

      -- Record refund in ledger
      INSERT INTO public.membership_ledger (player_id, membership_id, event_id, delta, reason, created_by)
      VALUES (p_player_id, membership_id, p_event_id, 1, 'refund', auth.uid())
      ON CONFLICT (player_id, membership_id, event_id, reason) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_status,
    'membership_updated', membership_id IS NOT NULL
  );
END;
$$;

-- Save event grades
CREATE OR REPLACE FUNCTION public.rpc_save_event_grades(
  p_event_id UUID,
  p_player_id UUID,
  p_metrics JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_overall NUMERIC(4,2);
  metric_count INTEGER;
  metric_sum NUMERIC;
BEGIN
  -- Check authorization
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'coach'::user_role) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Unauthorized to save grades';
  END IF;

  -- Calculate overall score (average of all metrics)
  SELECT 
    COUNT(*), 
    AVG((value->>'score')::NUMERIC)
  INTO metric_count, calculated_overall
  FROM jsonb_each(p_metrics) AS metrics(key, value)
  WHERE jsonb_typeof(value) = 'object' AND value->>'score' IS NOT NULL;

  calculated_overall := COALESCE(calculated_overall, 0.00);

  -- Upsert grade record
  INSERT INTO public.event_player_grades (event_id, player_id, metrics, overall, created_by)
  VALUES (p_event_id, p_player_id, p_metrics, calculated_overall, auth.uid())
  ON CONFLICT (event_id, player_id)
  DO UPDATE SET
    metrics = EXCLUDED.metrics,
    overall = EXCLUDED.overall,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'overall', calculated_overall,
    'metrics_count', metric_count
  );
END;
$$;

-- Get pending users for approval dashboard
CREATE OR REPLACE FUNCTION public.rpc_get_pending_users()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  approval_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.created_at,
    p.approval_status
  FROM public.profiles p
  WHERE p.approval_status = 'pending'
  ORDER BY p.created_at DESC;
$$;

-- 6. VIEWS

-- Create view for player latest grades
DROP VIEW IF EXISTS public.v_player_latest_grade CASCADE;
CREATE VIEW public.v_player_latest_grade AS
SELECT DISTINCT ON (player_id)
  player_id,
  event_id,
  metrics,
  overall,
  created_at,
  updated_at
FROM public.event_player_grades
ORDER BY player_id, updated_at DESC;

-- Create secure membership usage view
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;
CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  pm.id as membership_id,
  pm.player_id,
  pm.classes_total as allocated_classes,
  pm.classes_used as used_classes,
  pm.classes_remaining as remaining_classes,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN (pm.end_date - CURRENT_DATE)
    ELSE NULL
  END as days_left,
  (pm.classes_remaining <= 0 OR (pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE)) as should_deactivate,
  (pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE) as is_expired,
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
ORDER BY pm.created_at DESC;

-- 7. TRIGGERS

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_player_memberships_updated_at ON public.player_memberships;
CREATE TRIGGER update_player_memberships_updated_at
  BEFORE UPDATE ON public.player_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_player_grades_updated_at ON public.event_player_grades;
CREATE TRIGGER update_event_player_grades_updated_at
  BEFORE UPDATE ON public.event_player_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.attendance TO authenticated;
GRANT ALL ON public.player_memberships TO authenticated;
GRANT ALL ON public.membership_ledger TO authenticated;
GRANT ALL ON public.event_player_grades TO authenticated;
GRANT SELECT ON public.v_player_latest_grade TO authenticated;
GRANT SELECT ON public.vw_player_membership_usage_secure TO authenticated;