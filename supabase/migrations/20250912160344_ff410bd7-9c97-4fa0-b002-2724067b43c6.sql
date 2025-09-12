-- PHASE 1B: Fix Security Definer Views and remaining critical issues

-- Fix Security Definer Views by converting them to security_invoker
-- This prevents the views from bypassing RLS

-- Fix v_partner_summary view
DROP VIEW IF EXISTS public.v_partner_summary;
CREATE VIEW public.v_partner_summary 
WITH (security_invoker = on)
AS
SELECT 
  po.id,
  po.name,
  po.partnership_type,
  po.status,
  po.partnership_value,
  po.contract_start_date,
  po.contract_end_date,
  po.description,
  po.created_at,
  po.updated_at,
  pc.contact_name,
  pc.contact_email,
  pc.contact_phone,
  COALESCE(SUM(pts.sponsorship_amount), 0) as total_sponsorship_value,
  COUNT(pts.id) as total_sponsorships,
  COUNT(pts.id) FILTER (WHERE pts.status = 'active') as active_sponsorships,
  MIN(pts.start_date) as earliest_partnership,
  MAX(pts.end_date) as latest_partnership
FROM public.partner_organizations po
LEFT JOIN public.partner_contacts pc ON po.id = pc.partner_organization_id AND pc.is_primary = true
LEFT JOIN public.partner_team_sponsorships pts ON po.id = pts.partner_organization_id
GROUP BY po.id, po.name, po.partnership_type, po.status, po.partnership_value, 
         po.contract_start_date, po.contract_end_date, po.description, 
         po.created_at, po.updated_at, pc.contact_name, pc.contact_email, pc.contact_phone;

-- Ensure RLS is enabled on partner_organizations (already done in previous migration)
-- Add RLS policy for partner_organizations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partner_organizations' 
    AND policyname = 'Partners can view partner data safe'
  ) THEN
    CREATE POLICY "Partners can view partner data safe"
    ON public.partner_organizations
    FOR SELECT
    USING (
      is_super_admin(auth.uid()) OR 
      has_role(auth.uid(), 'partner'::user_role) OR 
      has_role(auth.uid(), 'staff'::user_role)
    );
  END IF;
END$$;

-- Secure exposed data tables with RLS policies
-- Fix employees table security (financial and personal data)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies and create comprehensive ones
DROP POLICY IF EXISTS "Employees can view compensation and sensitive data" ON public.employees;
CREATE POLICY "Employees can view their basic info only"
ON public.employees
FOR SELECT
USING (
  auth.uid() = user_id AND 
  -- Log access to sensitive employee data
  (SELECT public.log_employee_access(id, 'basic_info_access', false) FROM public.employees WHERE user_id = auth.uid() LIMIT 1) IS NOT NULL
);

-- Secure partner_contacts table (contact information harvesting)
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and partners can view contacts" ON public.partner_contacts;
CREATE POLICY "Authorized users can view partner contacts"
ON public.partner_contacts
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'partner'::user_role)
);

-- Secure manual_players table (contact information)
ALTER TABLE public.manual_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff and coaches can view manual players"
ON public.manual_players
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role)
);