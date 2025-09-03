-- Fix security definer issues by removing SECURITY DEFINER from views and ensuring proper function configuration

-- Drop and recreate any problematic views without SECURITY DEFINER
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;
DROP VIEW IF EXISTS public.employees_v CASCADE;

-- Create employees view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.employees_v AS
SELECT 
  p.id as employee_id,
  p.full_name,
  p.email,
  p.phone,
  ur.role::text as role,
  ur.is_active as role_active,
  CASE 
    WHEN ur.role = 'super_admin' THEN 'Super Admin'
    WHEN ur.role = 'coach' THEN 'Coach'
    WHEN ur.role = 'staff' THEN 'Staff'
    ELSE 'Employee'
  END as role_display,
  p.approval_status,
  p.created_at
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role IN ('super_admin', 'coach', 'staff')
  AND ur.is_active = true
  AND p.approval_status = 'approved';

-- Update the RPC function to have immutable search path
DROP FUNCTION IF EXISTS public.rpc_get_employees(text, integer, integer);

CREATE OR REPLACE FUNCTION public.rpc_get_employees(
  q text DEFAULT '',
  lim integer DEFAULT 50, 
  off integer DEFAULT 0
)
RETURNS TABLE(
  employee_id uuid, 
  full_name text, 
  email text, 
  role text, 
  role_display text, 
  phone text
)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow super admins, staff, and coaches to fetch employee data
  IF NOT (
    public.is_super_admin(auth.uid()) OR 
    public.has_role(auth.uid(), 'staff'::public.user_role) OR 
    public.has_role(auth.uid(), 'coach'::public.user_role)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    ur.role::text,
    CASE 
      WHEN ur.role = 'super_admin' THEN 'Super Admin'
      WHEN ur.role = 'coach' THEN 'Coach'
      WHEN ur.role = 'staff' THEN 'Staff'
      ELSE 'Employee'
    END,
    p.phone
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('super_admin', 'coach', 'staff')
    AND ur.is_active = true
    AND p.approval_status = 'approved'
    AND (q = '' OR p.full_name ILIKE '%' || q || '%' OR p.email ILIKE '%' || q || '%')
  ORDER BY p.full_name
  LIMIT lim
  OFFSET off;
END;
$$;

-- Ensure proper RLS policies are applied to schedules table for new columns
CREATE POLICY "Super admins can manage event status and images" 
ON public.schedules 
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Allow staff to view archived events
CREATE POLICY "Staff can view archived events" 
ON public.schedules 
FOR SELECT
USING (
  status IN ('active', 'archived') OR 
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

-- Only super admins can see deleted events
CREATE POLICY "Only super admins can view deleted events" 
ON public.schedules 
FOR SELECT
USING (
  (status != 'deleted') OR 
  is_super_admin(auth.uid())
);