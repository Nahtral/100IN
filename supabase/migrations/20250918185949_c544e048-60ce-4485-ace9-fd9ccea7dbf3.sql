-- Fix membership system schema and add hardened RPCs

-- 1) MEMBERSHIP TYPES: ensure canonical class_count column exists
ALTER TABLE membership_types 
ADD COLUMN IF NOT EXISTS class_count int;

-- Backfill class_count from allocated_classes if needed
UPDATE membership_types 
SET class_count = COALESCE(class_count, allocated_classes)
WHERE class_count IS NULL;

-- Create stable view for compatibility
CREATE OR REPLACE VIEW membership_types_v AS
SELECT 
  id,
  name,
  allocation_type,
  class_count,
  allocated_classes,
  start_date_required,
  end_date_required,
  is_active,
  created_at,
  updated_at
FROM membership_types;

-- 2) PLAYER MEMBERSHIPS: ensure required columns exist
ALTER TABLE player_memberships 
ADD COLUMN IF NOT EXISTS override_class_count int,
ADD COLUMN IF NOT EXISTS auto_deactivate_when_used_up boolean DEFAULT true;

-- Fix remaining_classes if it's a generated column
DO $$
BEGIN
  -- Try to drop the expression if it's a generated column
  BEGIN
    EXECUTE 'ALTER TABLE player_memberships ALTER COLUMN remaining_classes DROP EXPRESSION';
  EXCEPTION WHEN OTHERS THEN
    -- Column might not be generated, continue
    NULL;
  END;
END$$;

-- Remove any default from remaining_classes (trigger will set it)
DO $$
BEGIN
  -- Try to drop default if it exists
  BEGIN
    EXECUTE 'ALTER TABLE player_memberships ALTER COLUMN remaining_classes DROP DEFAULT';
  EXCEPTION WHEN OTHERS THEN
    -- No default to drop
    NULL;
  END;
END$$;

-- 3) TRIGGER: initialize remaining_classes from override or default
CREATE OR REPLACE FUNCTION public.fn_pm_set_initial_remaining()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_default int;
BEGIN
  -- Get default class count from membership type
  SELECT mt.class_count
  INTO v_default
  FROM membership_types mt
  WHERE mt.id = NEW.membership_type_id;

  -- Initialize remaining_classes if not already set
  IF NEW.remaining_classes IS NULL THEN
    NEW.remaining_classes := COALESCE(NEW.override_class_count, v_default, 0);
  END IF;

  RETURN NEW;
END $$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_pm_set_initial_remaining ON player_memberships;
CREATE TRIGGER trg_pm_set_initial_remaining
  BEFORE INSERT ON player_memberships
  FOR EACH ROW 
  EXECUTE FUNCTION public.fn_pm_set_initial_remaining();

-- 4) HARDENED ASSIGN MEMBERSHIP RPC
CREATE OR REPLACE FUNCTION public.rpc_assign_membership(
  p_player_id uuid,
  p_membership_type_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_override_class_count int DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_auto_deactivate_when_used_up boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Insert new player membership (trigger will set remaining_classes)
  INSERT INTO player_memberships (
    player_id,
    membership_type_id,
    start_date,
    end_date,
    override_class_count,
    remaining_classes,  -- Leave NULL; trigger initializes this
    notes,
    auto_deactivate_when_used_up,
    status
  )
  VALUES (
    p_player_id,
    p_membership_type_id,
    p_start_date,
    p_end_date,
    p_override_class_count,
    NULL,  -- IMPORTANT: let trigger set it
    p_notes,
    p_auto_deactivate_when_used_up,
    'ACTIVE'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- 5) MEMBERSHIP USAGE LEDGER TABLE (if not exists)
CREATE TABLE IF NOT EXISTS membership_usage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  event_id uuid NOT NULL,
  player_membership_id uuid NOT NULL REFERENCES player_memberships(id),
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  amount int NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(player_id, event_id)
);

-- Enable RLS on ledger
ALTER TABLE membership_usage_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for ledger
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage usage ledger" ON membership_usage_ledger;
  DROP POLICY IF EXISTS "Medical staff can view usage ledger" ON membership_usage_ledger;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

CREATE POLICY "Super admins can manage usage ledger" ON membership_usage_ledger
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Medical staff can view usage ledger" ON membership_usage_ledger
  FOR SELECT USING (
    has_role(auth.uid(), 'medical'::user_role) OR 
    has_role(auth.uid(), 'staff'::user_role) OR
    is_super_admin(auth.uid())
  );

-- 6) ATTENDANCE MEMBERSHIP DEDUCTION RPC (idempotent)
CREATE OR REPLACE FUNCTION public.rpc_apply_attendance_membership(
  p_player_id uuid,
  p_event_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pm_id uuid;
  v_remaining int;
BEGIN
  -- Idempotency: if ledger already has this entry, do nothing
  IF EXISTS (
    SELECT 1 FROM membership_usage_ledger
    WHERE player_id = p_player_id AND event_id = p_event_id
  ) THEN
    RETURN;
  END IF;

  -- Find active membership for player
  SELECT pm.id, pm.remaining_classes
  INTO v_pm_id, v_remaining
  FROM player_memberships pm
  WHERE pm.player_id = p_player_id
    AND pm.status = 'ACTIVE'
    AND (pm.end_date IS NULL OR pm.end_date >= CURRENT_DATE)
    AND pm.remaining_classes > 0
  ORDER BY pm.start_date DESC
  LIMIT 1;

  -- If no active membership with remaining classes, do nothing
  IF v_pm_id IS NULL OR v_remaining <= 0 THEN
    RETURN;
  END IF;

  -- Deduct one class
  UPDATE player_memberships
  SET remaining_classes = GREATEST(remaining_classes - 1, 0),
      updated_at = now()
  WHERE id = v_pm_id;

  -- Record in ledger
  INSERT INTO membership_usage_ledger (
    player_id, 
    event_id, 
    player_membership_id, 
    used_at, 
    amount
  )
  VALUES (p_player_id, p_event_id, v_pm_id, now(), 1);
END $$;