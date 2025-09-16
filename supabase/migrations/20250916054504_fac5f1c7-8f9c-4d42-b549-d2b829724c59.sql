-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.rpc_get_pending_users();
DROP FUNCTION IF EXISTS public.rpc_approve_user_secure(uuid, text, text);

-- Create v_player_attendance_summary view
CREATE OR REPLACE VIEW public.v_player_attendance_summary AS
SELECT 
    a.player_id,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
    COUNT(*) as total_events
FROM public.attendance a
GROUP BY a.player_id;

-- Create enhanced RPC for getting pending users with correct structure
CREATE OR REPLACE FUNCTION public.rpc_get_pending_users()
RETURNS TABLE(
    user_id uuid,
    email text,
    full_name text,
    phone text,
    approval_status text,
    preferred_role text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can access pending users
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can view pending users';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.phone,
    p.approval_status,
    COALESCE(
      (SELECT ur.role::text FROM public.user_roles ur 
       WHERE ur.user_id = p.id AND ur.is_active = false 
       ORDER BY ur.created_at DESC LIMIT 1), 
      'player'
    ) as preferred_role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.approval_status = 'pending'
  ORDER BY p.created_at DESC;
END;
$$;

-- Create RPC for approving users securely
CREATE OR REPLACE FUNCTION public.rpc_approve_user_secure(
  target_user_id uuid,
  approval_decision text,
  rejection_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Only super admins can approve users
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can approve users';
  END IF;

  -- Update approval status
  UPDATE public.profiles 
  SET 
    approval_status = approval_decision,
    rejection_reason = CASE 
      WHEN approval_decision = 'rejected' THEN rejection_reason 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = target_user_id;

  -- If approved, assign default player role
  IF approval_decision = 'approved' THEN
    -- Assign player role
    INSERT INTO public.user_roles (
      user_id, role, is_active, created_at, approved_by, approved_at
    ) VALUES (
      target_user_id, 'player', true, now(), auth.uid(), now()
    ) ON CONFLICT (user_id, role) DO UPDATE SET
      is_active = true,
      approved_by = auth.uid(),
      approved_at = now();
  END IF;

  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    auth.uid(), 
    'user_approval_action',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'decision', approval_decision,
      'rejection_reason', rejection_reason
    ),
    now()
  );

  RETURN json_build_object(
    'success', true, 
    'message', 'User ' || approval_decision || ' successfully'
  );
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.v_player_attendance_summary TO authenticated;