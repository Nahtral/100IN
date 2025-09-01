-- Fix security issues detected by the linter

-- 1. Fix Function Search Path Mutable issue for existing functions
-- Update all functions to have a proper search_path set

-- First, let's check and fix any functions that might not have search_path set
-- Update the get_user_requested_role function to ensure proper search_path
CREATE OR REPLACE FUNCTION public.get_user_requested_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = user_uuid 
    AND is_active = false 
  ORDER BY created_at DESC 
  LIMIT 1;
$$;

-- Fix any other functions that might have security issues
-- Update existing functions to have proper search_path

-- Check if there are any problematic views and remove them if they exist
-- Drop any potential security definer views that might exist
DROP VIEW IF EXISTS vw_player_membership_usage_secure;

-- Create a secure version of the player membership usage view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.vw_player_membership_usage AS
SELECT 
    pm.player_id,
    p.first_name || ' ' || p.last_name as player_name,
    mt.name as membership_type_name,
    mt.allocation_type,
    pm.allocated_classes,
    COALESCE(pm.used_classes, 0) as used_classes,
    GREATEST(0, pm.allocated_classes - COALESCE(pm.used_classes, 0)) as remaining_classes,
    pm.status,
    pm.start_date,
    pm.end_date,
    CASE 
        WHEN pm.end_date < CURRENT_DATE THEN true
        ELSE false
    END as is_expired,
    CASE 
        WHEN pm.end_date IS NOT NULL THEN 
            GREATEST(0, EXTRACT(days FROM pm.end_date - CURRENT_DATE)::int)
        ELSE NULL
    END as days_left,
    CASE 
        WHEN pm.allocated_classes <= COALESCE(pm.used_classes, 0) 
             OR pm.end_date < CURRENT_DATE THEN true
        ELSE false
    END as should_deactivate
FROM public.player_memberships pm
JOIN public.players p ON pm.player_id = p.id
JOIN public.membership_types mt ON pm.membership_type_id = mt.id
WHERE pm.status = 'ACTIVE';

-- Enable RLS on the view
ALTER VIEW public.vw_player_membership_usage SET (security_invoker = on);

-- Create RLS policy for the view
CREATE POLICY "Users can view membership usage based on player access"
ON public.vw_player_membership_usage
FOR SELECT
USING (
  -- Super admins can see all
  is_super_admin(auth.uid()) OR
  -- Staff can see all  
  has_role(auth.uid(), 'staff'::user_role) OR
  -- Players can see their own
  (EXISTS (
    SELECT 1 FROM public.players 
    WHERE id = vw_player_membership_usage.player_id 
    AND user_id = auth.uid()
  )) OR
  -- Parents can see their children's
  (EXISTS (
    SELECT 1 FROM public.players pl
    JOIN public.parent_child_relationships pcr ON pl.user_id = pcr.child_id
    WHERE pl.id = vw_player_membership_usage.player_id 
    AND pcr.parent_id = auth.uid()
  ))
);

-- Also ensure all functions have proper security settings
-- Update mask_employee_compensation function
CREATE OR REPLACE FUNCTION public.mask_employee_compensation(_salary numeric, _hourly_rate numeric, _employee_user_id uuid)
RETURNS record
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result record;
BEGIN
  -- Check if user can view compensation data
  IF is_super_admin(auth.uid()) OR 
     (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')) THEN
    -- Return actual values for authorized users
    SELECT _salary as salary, _hourly_rate as hourly_rate INTO result;
  ELSE
    -- Return null for unauthorized users
    SELECT null::numeric as salary, null::numeric as hourly_rate INTO result;
  END IF;
  
  RETURN result;
END;
$$;

-- Update mask_sensitive_email function
CREATE OR REPLACE FUNCTION public.mask_sensitive_email(email_input text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only mask for non-super admins and non-staff
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RETURN LEFT(email_input, 3) || '***@' || SPLIT_PART(email_input, '@', 2);
  END IF;
  RETURN email_input;
END;
$$;

-- Ensure the fn_get_membership_summary function has proper search_path  
CREATE OR REPLACE FUNCTION public.fn_get_membership_summary(target_player_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT row_to_json(summary)
  FROM (
    SELECT 
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
    FROM vw_player_membership_usage 
    WHERE player_id = target_player_id
    ORDER BY start_date DESC
    LIMIT 1
  ) summary;
$$;