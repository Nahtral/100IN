-- Production Stabilization Migration - Phase 1B: Fix Trigger Conflicts
-- This fixes the player approval check trigger that was blocking user role creation

-- First, temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS before_insert_player_approval_check ON players;

-- Create a more robust player approval check that allows admin users
CREATE OR REPLACE FUNCTION public.before_insert_player_approval_check_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow super admins to create player records for anyone
  IF is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is approved or super admin before allowing player record creation
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = NEW.user_id 
      AND approval_status = 'approved'
    ) OR is_super_admin(NEW.user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot create player record: User must be approved first';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger with the new function
CREATE TRIGGER before_insert_player_approval_check_v2
  BEFORE INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION public.before_insert_player_approval_check_v2();

-- Now fix the user role creation trigger to not create player records automatically
CREATE OR REPLACE FUNCTION public.handle_new_player_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create player record if user is approved or super admin
  IF NEW.role = 'player' AND NEW.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = NEW.user_id 
      AND (approval_status = 'approved' OR is_super_admin(NEW.user_id))
    ) THEN
      INSERT INTO public.players (
        user_id, is_active, created_at, updated_at, 
        total_shots, total_makes, shooting_percentage, 
        avg_arc_degrees, avg_depth_inches, total_sessions
      )
      VALUES (
        NEW.user_id, true, now(), now(), 0, 0, 0.00, 0.00, 0.00, 0
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the handle_new_user_secure function to not assign player role automatically
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

  -- Don't assign roles automatically - wait for approval
  -- This prevents the trigger conflict

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  INSERT INTO error_logs (user_id, message, stack, created_at)
  VALUES (NEW.id, 'Profile creation failed: ' || SQLERRM, NULL, now());
  RETURN NEW;
END;
$$;

-- Safe backfill that respects approval status
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

  -- Only assign roles to users who are already approved or super admins
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
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.user_id IS NULL 
  AND (p.approval_status = 'approved' OR is_super_admin(u.id));
END;
$$;

-- Create approval workflow RPC that properly assigns roles and creates player records
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

  -- If approved, assign player role and create player record
  IF approval_decision = 'approved' THEN
    -- Assign player role
    INSERT INTO public.user_roles (user_id, role, is_active, created_at, approved_by, approved_at)
    VALUES (target_user_id, 'player', true, now(), auth.uid(), now())
    ON CONFLICT (user_id, role) DO UPDATE SET 
      is_active = true, 
      approved_by = auth.uid(), 
      approved_at = now();

    -- Create player record
    INSERT INTO public.players (
      user_id, is_active, created_at, updated_at, 
      total_shots, total_makes, shooting_percentage, 
      avg_arc_degrees, avg_depth_inches, total_sessions
    )
    VALUES (target_user_id, true, now(), now(), 0, 0, 0.00, 0.00, 0.00, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create welcome notification
    INSERT INTO notifications (user_id, type_id, title, message, priority)
    VALUES (
      target_user_id,
      (SELECT id FROM notification_types WHERE name = 'system' LIMIT 1),
      'Welcome to 100IN!',
      'Your account has been approved. You can now access all features.',
      'high'
    );
  END IF;

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

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'decision', approval_decision,
    'timestamp', now()
  );
END;
$$;

SELECT 'Trigger conflicts resolved, production stabilization phase 1 complete' as status;