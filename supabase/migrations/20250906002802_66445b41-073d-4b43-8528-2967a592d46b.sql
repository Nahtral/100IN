-- Fix function signature issue and implement critical security fix
-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_employees_secure();

-- Create the secure function with proper signature
CREATE OR REPLACE FUNCTION public.get_employees_secure()
RETURNS TABLE(
  employee_id uuid,
  role_active boolean,
  created_at timestamp with time zone,
  approval_status text,
  role_display text,
  full_name text,
  email text,
  phone text,
  role text
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as employee_id,
    ur.is_active as role_active,
    p.created_at,
    p.approval_status,
    CASE 
      WHEN ur.role = 'super_admin' THEN 'Super Admin'
      WHEN ur.role = 'coach' THEN 'Coach'
      WHEN ur.role = 'staff' THEN 'Staff'
      ELSE 'Employee'
    END as role_display,
    p.full_name,
    CASE 
      WHEN is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role) THEN p.email
      ELSE mask_sensitive_email(p.email)
    END as email,
    p.phone,
    ur.role::text
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('super_admin', 'coach', 'staff')
    AND (
      -- Only super admins, staff, and coaches can access employee data
      is_super_admin(auth.uid()) OR 
      has_role(auth.uid(), 'staff'::user_role) OR 
      has_role(auth.uid(), 'coach'::user_role) OR
      -- Employees can see their own data
      auth.uid() = p.id
    );
$$;