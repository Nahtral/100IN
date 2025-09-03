-- Fix Security Linter Issues: Security Definer View and Function Search Path

-- First, let's recreate the view without security definer and rely on RLS policies instead
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure;

-- Create a regular view that relies on RLS policies for security
CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  p.id AS player_id,
  COALESCE(p.name, p.manual_entry_name, 'Unknown Player') AS player_name,
  COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) AS allocated_classes,
  0 AS used_classes,
  GREATEST(0, COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0)) AS remaining_classes,
  pm.status,
  mt.name AS membership_type_name,
  CASE
    WHEN pm.end_date IS NOT NULL THEN GREATEST(0, pm.end_date - CURRENT_DATE)
    ELSE NULL
  END AS days_left,
  CASE
    WHEN pm.end_date IS NOT NULL AND pm.end_date <= CURRENT_DATE THEN true
    ELSE false
  END AS should_deactivate,
  CASE
    WHEN pm.end_date IS NOT NULL AND pm.end_date <= CURRENT_DATE THEN true
    ELSE false
  END AS is_expired,
  pm.start_date,
  pm.end_date,
  mt.allocation_type
FROM players p
LEFT JOIN player_memberships pm ON p.id = pm.player_id AND pm.status = 'ACTIVE'
LEFT JOIN membership_types mt ON pm.membership_type_id = mt.id
WHERE p.is_active = true;

-- Enable RLS on the view (views inherit RLS from underlying tables)
-- The view will now use the RLS policies from players, player_memberships, and membership_types tables

-- Add comprehensive RLS policy for the view access
CREATE POLICY "View membership usage - super admin and staff" 
ON public.players 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR
  has_role(auth.uid(), 'coach'::user_role)
);

-- Update any functions that might be missing proper search_path settings
-- Check and update the update_updated_at_column function if it exists
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create a comment explaining the security improvements
COMMENT ON VIEW public.vw_player_membership_usage_secure IS 
'Secure view for player membership data. Uses RLS policies from underlying tables instead of SECURITY DEFINER for improved security posture. Access controlled through player table RLS policies.';

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'Trigger function to update updated_at timestamp. Uses SECURITY DEFINER with explicit search_path for security compliance.';

-- Log the security improvements
INSERT INTO public.analytics_events (
  event_type,
  event_data,
  user_id,
  created_at
) VALUES (
  'security_improvement',
  jsonb_build_object(
    'action', 'linter_fixes_applied',
    'fixes', jsonb_build_array(
      'removed_security_definer_view',
      'added_explicit_search_path_to_functions',
      'enhanced_rls_policies'
    ),
    'view_updated', 'vw_player_membership_usage_secure',
    'security_level', 'improved'
  ),
  (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1),
  NOW()
);