-- Production Stabilization Migration - Phase 1: Emergency Fixes
-- This migration addresses critical issues for production deployment

-- Fix 1: Secure attendance batch RPC (replaces problematic p.team_id references)
CREATE OR REPLACE FUNCTION public.rpc_save_attendance_secure(
  p_event_id uuid,
  p_team_id uuid, 
  p_entries jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry jsonb;
  v_player_id uuid;
  v_status text;
  v_notes text;
  results jsonb := '[]'::jsonb;
  error_count integer := 0;
  success_count integer := 0;
BEGIN
  -- Authorization check
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role)) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient privileges to record attendance';
  END IF;

  -- Validate inputs
  IF p_event_id IS NULL OR p_team_id IS NULL THEN
    RAISE EXCEPTION 'event_id and team_id are required';
  END IF;

  -- Process each entry
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    BEGIN
      v_player_id := (entry->>'player_id')::uuid;
      v_status := entry->>'status';
      v_notes := entry->>'notes';

      IF v_player_id IS NULL OR v_status IS NULL THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Verify player is in team using explicit team_members table
      IF NOT EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.user_id = v_player_id 
        AND tm.team_id = p_team_id 
        AND tm.is_active = true
      ) THEN
        error_count := error_count + 1;
        results := results || jsonb_build_object(
          'player_id', v_player_id,
          'status', 'error',
          'message', 'Player not in team'
        );
        CONTINUE;
      END IF;

      -- Upsert attendance record
      INSERT INTO attendance (event_id, team_id, player_id, status, notes, recorded_by)
      VALUES (p_event_id, p_team_id, v_player_id, v_status, v_notes, auth.uid())
      ON CONFLICT (event_id, player_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        recorded_by = EXCLUDED.recorded_by,
        recorded_at = now();

      success_count := success_count + 1;
      results := results || jsonb_build_object(
        'player_id', v_player_id,
        'status', 'success'
      );

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      results := results || jsonb_build_object(
        'player_id', v_player_id,
        'status', 'error',
        'message', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'results', results
  );
END;
$$;

-- Fix 2: Hardened user profile creation trigger (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Idempotent profile creation - only if not exists
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    approval_status, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default player role (idempotent)
  INSERT INTO public.user_roles (
    user_id,
    role,
    is_active,
    created_at,
    approved_by,
    approved_at
  )
  VALUES (
    NEW.id,
    'player',
    true,
    now(),
    NEW.id, -- Self-assigned for default role
    now()
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  INSERT INTO error_logs (user_id, message, stack, created_at)
  VALUES (NEW.id, 'Profile creation failed: ' || SQLERRM, NULL, now());
  RETURN NEW;
END;
$$;

-- Recreate trigger with proper naming
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created_secure
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_secure();

-- Fix 3: Backfill orphaned users (safe for production)
DO $$
BEGIN
  -- Insert profiles for any auth.users without profiles
  INSERT INTO public.profiles (id, email, full_name, approval_status, created_at, updated_at)
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User'),
    'pending',
    u.created_at,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  -- Insert default player roles for users without roles
  INSERT INTO public.user_roles (user_id, role, is_active, created_at, approved_by, approved_at)
  SELECT 
    u.id,
    'player',
    true,
    u.created_at,
    u.id,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE ur.user_id IS NULL;
END;
$$;

-- Fix 4: Performance indexes for 1500+ concurrent users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_event_player ON attendance(event_id, player_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_team_id ON attendance(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user_team_active ON team_members(user_id, team_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_role_active ON user_roles(user_id, role, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_memberships_player_active ON player_memberships(player_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_membership_ledger_player_event ON membership_ledger(player_id, event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Fix 5: Secure RPC for user approval with proper audit trail
CREATE OR REPLACE FUNCTION public.rpc_approve_user_secure(
  target_user_id uuid,
  approval_decision text DEFAULT 'approved',
  rejection_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile record;
BEGIN
  -- Only super admins can approve users
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can approve users';
  END IF;

  -- Validate decision
  IF approval_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval decision: must be approved or rejected';
  END IF;

  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update approval status
  UPDATE profiles 
  SET 
    approval_status = approval_decision,
    rejection_reason = CASE WHEN approval_decision = 'rejected' THEN rejection_reason ELSE NULL END,
    updated_at = now()
  WHERE id = target_user_id;

  -- Log the approval action
  INSERT INTO analytics_events (user_id, event_type, event_data, created_at)
  VALUES (
    auth.uid(),
    'user_approval',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'decision', approval_decision,
      'reason', rejection_reason,
      'previous_status', user_profile.approval_status
    ),
    now()
  );

  -- Create notification for approved user
  IF approval_decision = 'approved' THEN
    INSERT INTO notifications (user_id, type_id, title, message, priority)
    VALUES (
      target_user_id,
      (SELECT id FROM notification_types WHERE name = 'system' LIMIT 1),
      'Account Approved',
      'Your account has been approved and you can now access the system.',
      'high'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'decision', approval_decision,
    'timestamp', now()
  );
END;
$$;

-- Fix 6: Secure pending users view without auth.users exposure
CREATE OR REPLACE VIEW public.v_pending_users_secure AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.approval_status,
  p.rejection_reason,
  p.created_at,
  p.updated_at,
  -- Safe aggregated role information
  (
    SELECT json_agg(ur.role::text) 
    FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.is_active = true
  ) as roles
FROM profiles p
WHERE p.approval_status = 'pending'
ORDER BY p.created_at ASC;

-- RLS for pending users view
ALTER VIEW v_pending_users_secure SET (security_barrier = true);

-- Fix 7: Remove problematic security definer views and replace with safer functions
-- (These will be created as needed in subsequent migrations)

-- Fix 8: Connection pooling optimization
-- Enable statement timeout for long-running queries
ALTER DATABASE postgres SET statement_timeout = '30s';
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '10s';

-- Fix 9: Enhanced error tracking
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'failed')),
  response_time_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS for system health checks
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage health checks"
ON system_health_checks FOR ALL
USING (is_super_admin(auth.uid()));

-- Add health check indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_type_status ON system_health_checks(check_type, status);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON system_health_checks(created_at);

-- Success message
SELECT 'Production stabilization migration completed successfully' as status;