-- Phase 1: Complete Rebuild - Database Schema Migration
-- Create new unified membership tables using user_id consistently with attendance

-- 1. Create new player_memberships_v2 table aligned with attendance system
CREATE TABLE player_memberships_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Direct reference to profiles.id (same as team_members.user_id)
  membership_type_id UUID NOT NULL REFERENCES membership_types(id),
  allocated_classes INTEGER NOT NULL DEFAULT 0,
  used_classes INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PAUSED')),
  auto_deactivate BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_player_memberships_v2_user_id FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_memberships_v2_created_by FOREIGN KEY (created_by) REFERENCES profiles(id),
  UNIQUE(user_id, membership_type_id, start_date) -- Prevent duplicate active memberships
);

-- Enable RLS
ALTER TABLE player_memberships_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_memberships_v2
CREATE POLICY "Super admins can manage all memberships v2" ON player_memberships_v2
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage memberships v2" ON player_memberships_v2
  FOR ALL USING (has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Users can view their own membership v2" ON player_memberships_v2
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can view children memberships v2" ON player_memberships_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pcr
      WHERE pcr.child_id = user_id AND pcr.parent_id = auth.uid()
    )
  );

-- 2. Create membership transaction ledger for complete audit trail
CREATE TABLE membership_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES player_memberships_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- For easy querying
  event_id UUID REFERENCES schedules(id), -- Nullable for manual adjustments
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deduction', 'addition', 'initial', 'adjustment')),
  delta INTEGER NOT NULL, -- Negative for deductions, positive for additions
  balance_after INTEGER NOT NULL, -- Running balance for audit
  reason TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_membership_transactions_user_id FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT fk_membership_transactions_created_by FOREIGN KEY (created_by) REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE membership_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership_transactions
CREATE POLICY "Super admins can manage all transactions" ON membership_transactions
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view transactions" ON membership_transactions
  FOR SELECT USING (has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Users can view their own transactions" ON membership_transactions
  FOR SELECT USING (user_id = auth.uid());

-- 3. Create new unified membership view using user_id (same as attendance)
CREATE OR REPLACE VIEW vw_membership_summary_v2 AS
SELECT 
  pm.id AS membership_id,
  pm.user_id,
  p.full_name AS player_name,
  pm.allocated_classes,
  pm.used_classes,
  (pm.allocated_classes - pm.used_classes) AS remaining_classes,
  pm.start_date,
  pm.end_date,
  pm.status,
  mt.name AS membership_type_name,
  mt.allocation_type,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN (pm.end_date - CURRENT_DATE)
    ELSE NULL 
  END AS days_left,
  (pm.used_classes >= pm.allocated_classes OR (pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE)) AS should_deactivate,
  (pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE) AS is_expired
FROM player_memberships_v2 pm
JOIN profiles p ON pm.user_id = p.id
JOIN membership_types mt ON pm.membership_type_id = mt.id
WHERE pm.status = 'ACTIVE';

-- 4. Enhanced attendance summary with membership integration
CREATE OR REPLACE VIEW vw_attendance_with_membership_v2 AS
SELECT 
  a.*,
  ms.membership_id,
  ms.remaining_classes,
  ms.membership_type_name,
  ms.should_deactivate
FROM attendance a
LEFT JOIN vw_membership_summary_v2 ms ON a.player_id = ms.user_id;

-- 5. Create new membership assignment RPC using user_id
CREATE OR REPLACE FUNCTION rpc_assign_membership_v2(
  p_user_id UUID,
  p_membership_type_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL,
  p_override_class_count INTEGER DEFAULT NULL,
  p_auto_deactivate BOOLEAN DEFAULT true,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mt RECORD;
  v_allocated_classes INTEGER;
  new_membership_id UUID;
BEGIN
  -- Only super admins and staff can assign memberships
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Only super admins and staff can assign memberships';
  END IF;

  -- Validate membership type
  SELECT * INTO mt FROM membership_types WHERE id = p_membership_type_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive membership type';
  END IF;

  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Determine allocated classes
  IF mt.allocation_type = 'CLASS_COUNT' THEN
    v_allocated_classes := COALESCE(p_override_class_count, mt.allocated_classes, 0);
  ELSE
    v_allocated_classes := 999999; -- Unlimited
  END IF;

  -- Deactivate existing active memberships for this user
  UPDATE player_memberships_v2 
  SET status = 'INACTIVE', updated_at = now()
  WHERE user_id = p_user_id AND status = 'ACTIVE';

  -- Create new membership
  INSERT INTO player_memberships_v2 (
    user_id, membership_type_id, allocated_classes, used_classes,
    start_date, end_date, status, auto_deactivate, notes, created_by
  ) VALUES (
    p_user_id, p_membership_type_id, v_allocated_classes, 0,
    p_start_date, p_end_date, 'ACTIVE', p_auto_deactivate, p_notes, auth.uid()
  ) RETURNING id INTO new_membership_id;

  -- Create initial transaction record
  INSERT INTO membership_transactions (
    membership_id, user_id, transaction_type, delta, balance_after, reason, created_by
  ) VALUES (
    new_membership_id, p_user_id, 'initial', v_allocated_classes, v_allocated_classes, 
    'Initial membership allocation', auth.uid()
  );

  RETURN new_membership_id;
END;
$$;

-- 6. Create atomic attendance + membership deduction RPC
CREATE OR REPLACE FUNCTION rpc_record_attendance_with_membership_v2(
  p_event_id UUID,
  p_team_id UUID,
  p_attendance_records JSONB
) RETURNS TABLE(user_id UUID, status TEXT, membership_deducted BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec JSONB;
  v_user_id UUID;
  v_status TEXT;
  v_notes TEXT;
  v_membership_id UUID;
  v_remaining_classes INTEGER;
  deduction_made BOOLEAN := FALSE;
BEGIN
  -- Validation
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role)) THEN
    RAISE EXCEPTION 'Unauthorized to record attendance';
  END IF;

  -- Process each attendance record
  FOR rec IN SELECT * FROM jsonb_array_elements(p_attendance_records)
  LOOP
    v_user_id := (rec->>'user_id')::UUID;
    v_status := rec->>'status';
    v_notes := rec->>'notes';
    deduction_made := FALSE;

    -- Verify team membership
    IF NOT EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = v_user_id AND team_id = p_team_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'User % is not a member of team %', v_user_id, p_team_id;
    END IF;

    -- Upsert attendance record
    INSERT INTO attendance (event_id, team_id, player_id, status, notes, recorded_by)
    VALUES (p_event_id, p_team_id, v_user_id, v_status, v_notes, auth.uid())
    ON CONFLICT (event_id, player_id) 
    DO UPDATE SET 
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      team_id = EXCLUDED.team_id,
      recorded_by = auth.uid(),
      recorded_at = now();

    -- Handle membership deduction for present players
    IF v_status = 'present' THEN
      -- Check if already deducted for this event
      IF NOT EXISTS (
        SELECT 1 FROM membership_transactions 
        WHERE user_id = v_user_id AND event_id = p_event_id AND transaction_type = 'deduction'
      ) THEN
        -- Find active membership with remaining classes
        SELECT pm.id, (pm.allocated_classes - pm.used_classes) 
        INTO v_membership_id, v_remaining_classes
        FROM player_memberships_v2 pm
        WHERE pm.user_id = v_user_id 
          AND pm.status = 'ACTIVE'
          AND (pm.allocated_classes - pm.used_classes) > 0
        ORDER BY pm.start_date DESC
        LIMIT 1;

        IF v_membership_id IS NOT NULL THEN
          -- Deduct class
          UPDATE player_memberships_v2
          SET used_classes = used_classes + 1, updated_at = now()
          WHERE id = v_membership_id;

          -- Record transaction
          INSERT INTO membership_transactions (
            membership_id, user_id, event_id, transaction_type, 
            delta, balance_after, reason, created_by
          ) VALUES (
            v_membership_id, v_user_id, p_event_id, 'deduction',
            -1, v_remaining_classes - 1, 'Attendance deduction', auth.uid()
          );

          deduction_made := TRUE;

          -- Auto-deactivate if membership is used up
          IF v_remaining_classes - 1 <= 0 THEN
            UPDATE player_memberships_v2
            SET status = 'INACTIVE', updated_at = now()
            WHERE id = v_membership_id AND auto_deactivate = true;
          END IF;
        END IF;
      END IF;
    END IF;

    RETURN QUERY SELECT v_user_id, v_status, deduction_made;
  END LOOP;
END;
$$;

-- 7. Create function to get membership summary using user_id
CREATE OR REPLACE FUNCTION fn_get_membership_summary_v2(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    FROM vw_membership_summary_v2 
    WHERE user_id = target_user_id
    ORDER BY start_date DESC
    LIMIT 1
  ) summary;
$$;

-- 8. Migrate existing data from old schema to new schema
INSERT INTO player_memberships_v2 (
  user_id,
  membership_type_id,
  allocated_classes,
  used_classes,
  start_date,
  end_date,
  status,
  auto_deactivate,
  notes,
  created_by,
  created_at,
  updated_at
)
SELECT 
  pl.user_id, -- Use user_id from players table
  pm.membership_type_id,
  COALESCE(pm.classes_total, 0),
  COALESCE(pm.classes_used, 0),
  pm.start_date,
  pm.end_date,
  pm.status,
  true, -- Default auto_deactivate
  'Migrated from old schema',
  COALESCE(pm.created_by, (SELECT id FROM profiles WHERE email = 'admin@example.com' LIMIT 1)),
  pm.created_at,
  pm.updated_at
FROM player_memberships pm
JOIN players pl ON pm.player_id = pl.id
WHERE NOT EXISTS (
  -- Avoid duplicates
  SELECT 1 FROM player_memberships_v2 pm2 
  WHERE pm2.user_id = pl.user_id 
    AND pm2.membership_type_id = pm.membership_type_id 
    AND pm2.start_date = pm.start_date
);

-- 9. Create initial transaction records for migrated data
INSERT INTO membership_transactions (
  membership_id,
  user_id,
  transaction_type,
  delta,
  balance_after,
  reason,
  created_by,
  created_at
)
SELECT 
  pm2.id,
  pm2.user_id,
  'initial',
  pm2.allocated_classes,
  pm2.allocated_classes,
  'Migrated initial allocation',
  pm2.created_by,
  pm2.created_at
FROM player_memberships_v2 pm2
WHERE NOT EXISTS (
  SELECT 1 FROM membership_transactions mt
  WHERE mt.membership_id = pm2.id AND mt.transaction_type = 'initial'
);

-- Create usage transaction records for existing used classes
INSERT INTO membership_transactions (
  membership_id,
  user_id,
  transaction_type,
  delta,
  balance_after,
  reason,
  created_by,
  created_at
)
SELECT 
  pm2.id,
  pm2.user_id,
  'deduction',
  -pm2.used_classes,
  (pm2.allocated_classes - pm2.used_classes),
  'Migrated historical usage',
  pm2.created_by,
  pm2.updated_at
FROM player_memberships_v2 pm2
WHERE pm2.used_classes > 0
AND NOT EXISTS (
  SELECT 1 FROM membership_transactions mt
  WHERE mt.membership_id = pm2.id AND mt.reason = 'Migrated historical usage'
);

-- Add indexes for performance
CREATE INDEX idx_player_memberships_v2_user_id ON player_memberships_v2(user_id);
CREATE INDEX idx_player_memberships_v2_status ON player_memberships_v2(status);
CREATE INDEX idx_membership_transactions_user_id ON membership_transactions(user_id);
CREATE INDEX idx_membership_transactions_membership_id ON membership_transactions(membership_id);
CREATE INDEX idx_membership_transactions_event_id ON membership_transactions(event_id) WHERE event_id IS NOT NULL;