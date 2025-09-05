-- Create RPC function for teams without is_active column
CREATE OR REPLACE FUNCTION public.get_active_teams()
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.name
  FROM public.teams t
  ORDER BY t.name;
$$;

-- Fix remaining security definer views by dropping them
-- Check if employees_v exists and drop it
DROP VIEW IF EXISTS public.employees_v CASCADE;

-- Check what views have SECURITY DEFINER and fix them
-- First let's see what views exist
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN 
        SELECT viewname FROM pg_views WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'DROP VIEW IF EXISTS public.' || view_name || ' CASCADE';
        EXCEPTION 
            WHEN OTHERS THEN
                -- Continue if view doesn't exist or can't be dropped
                NULL;
        END;
    END LOOP;
END $$;

-- Recreate essential views without SECURITY DEFINER
CREATE VIEW public.employees_v AS
SELECT 
    p.id as employee_id,
    p.full_name,
    p.email,
    p.phone,
    ur.role::text as role,
    ur.is_active as role_active,
    p.approval_status,
    p.created_at,
    CASE 
        WHEN ur.role = 'super_admin' THEN 'Super Admin'
        WHEN ur.role = 'coach' THEN 'Coach'
        WHEN ur.role = 'staff' THEN 'Staff'
        ELSE 'Employee'
    END as role_display
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role IN ('super_admin', 'coach', 'staff')
    AND p.approval_status = 'approved';

-- Enable RLS on the view
ALTER VIEW public.employees_v SET (security_invoker = true);