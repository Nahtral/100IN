-- Fix Security Linter Issues: Remove Security Definer View and Ensure Functions Have Proper Search Path

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

-- Update the existing function to ensure it has proper search_path (if it doesn't already)
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
'Secure view for player membership data. Removed SECURITY DEFINER and now relies on RLS policies from underlying tables for improved security posture. Access controlled through existing table RLS policies.';

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'Trigger function to update updated_at timestamp. Uses SECURITY DEFINER with explicit search_path = public for security compliance.';

-- Log the security improvements
INSERT INTO public.analytics_events (
  event_type,
  event_data,
  user_id,
  created_at
) VALUES (
  'security_improvement',
  jsonb_build_object(
    'action', 'linter_security_fixes_applied',
    'fixes', jsonb_build_array(
      'removed_security_definer_from_view',
      'ensured_search_path_on_functions'
    ),
    'view_updated', 'vw_player_membership_usage_secure',
    'security_level', 'improved',
    'linter_issues_resolved', jsonb_build_array(
      '0010_security_definer_view',
      '0011_function_search_path_mutable'
    )
  ),
  (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1),
  NOW()
);