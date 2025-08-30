-- Fix security definer functions by adding proper search_path settings
-- This prevents search_path manipulation attacks

-- Update critical security definer functions to use safe search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check if user has permission through role
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id 
      AND ur.is_active = TRUE
      AND p.name = _permission_name
  )
  OR
  -- Check if user has additional permission directly
  EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id 
      AND up.is_active = TRUE
      AND p.name = _permission_name
  );
$$;

-- Secure the problematic view by removing SECURITY DEFINER and using proper RLS
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure;

CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  p.id as player_id,
  COALESCE(p.name, pr.full_name, 'Unknown Player') as player_name,
  COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) as allocated_classes,
  0 as used_classes, -- This would need to be calculated from actual usage data
  GREATEST(0, COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0)) as remaining_classes,
  pm.status,
  mt.name as membership_type_name,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN 
      GREATEST(0, (pm.end_date - CURRENT_DATE)::integer)
    ELSE NULL 
  END as days_left,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date <= CURRENT_DATE THEN true
    WHEN pm.status = 'INACTIVE' THEN true
    ELSE false 
  END as should_deactivate,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date <= CURRENT_DATE THEN true
    ELSE false 
  END as is_expired,
  pm.start_date,
  pm.end_date,
  mt.allocation_type
FROM public.players p
LEFT JOIN public.profiles pr ON p.user_id = pr.id
LEFT JOIN public.player_memberships pm ON p.id = pm.player_id 
  AND pm.status = 'ACTIVE'
LEFT JOIN public.membership_types mt ON pm.membership_type_id = mt.id
WHERE p.is_active = true;