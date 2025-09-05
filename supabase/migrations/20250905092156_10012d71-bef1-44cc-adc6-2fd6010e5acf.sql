-- Create RPC function to get active teams and fix security definer views
-- This avoids TypeScript issues while maintaining security

-- Create a simple RPC function for getting teams
CREATE OR REPLACE FUNCTION public.get_active_teams()
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.name
  FROM public.teams t
  WHERE t.is_active = true
  ORDER BY t.name;
$$;

-- Drop and recreate any problematic security definer views
-- First check if vw_player_membership_usage_secure exists and drop it
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;

-- Recreate the view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  pm.id,
  pm.player_id,
  p.full_name as player_name,
  pm.membership_type_id,
  mt.name as membership_type_name,
  mt.allocation_type,
  COALESCE(pm.allocated_classes, mt.allocated_classes) as allocated_classes,
  COALESCE(pm.used_classes, 0) as used_classes,
  GREATEST(0, COALESCE(pm.allocated_classes, mt.allocated_classes, 0) - COALESCE(pm.used_classes, 0)) as remaining_classes,
  pm.start_date,
  pm.end_date,
  pm.status,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN 
      GREATEST(0, (pm.end_date - CURRENT_DATE))
    ELSE NULL 
  END as days_left,
  CASE 
    WHEN mt.allocation_type = 'unlimited' THEN false
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    WHEN mt.allocation_type = 'sessions' AND COALESCE(pm.used_classes, 0) >= COALESCE(pm.allocated_classes, mt.allocated_classes, 0) THEN true
    ELSE false
  END as is_expired,
  CASE 
    WHEN mt.allocation_type = 'unlimited' THEN false
    WHEN pm.end_date IS NOT NULL AND pm.end_date <= CURRENT_DATE + INTERVAL '7 days' THEN true
    WHEN mt.allocation_type = 'sessions' AND (COALESCE(pm.allocated_classes, mt.allocated_classes, 0) - COALESCE(pm.used_classes, 0)) <= 2 THEN true
    ELSE false
  END as should_deactivate
FROM public.player_memberships pm
JOIN public.players pl ON pm.player_id = pl.id
JOIN public.profiles p ON pl.user_id = p.id
JOIN public.membership_types mt ON pm.membership_type_id = mt.id
WHERE pm.status = 'ACTIVE';

-- Add RLS policy for the view
ALTER TABLE public.vw_player_membership_usage_secure ENABLE ROW LEVEL SECURITY;

-- Add policy for the view
CREATE POLICY "Super admins can view membership usage" ON public.vw_player_membership_usage_secure
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Drop employees_v view if it exists (another potential security definer view)
DROP VIEW IF EXISTS public.employees_v CASCADE;