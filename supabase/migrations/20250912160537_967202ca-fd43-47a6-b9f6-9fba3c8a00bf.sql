-- PHASE 2: Secure Remaining Data Exposure Issues
-- Address the 5 critical data exposure warnings from security scan

-- Secure partner_contacts table (contact information harvesting protection)
ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and partners can view contacts" ON public.partner_contacts;
DROP POLICY IF EXISTS "Authorized users can view partner contacts" ON public.partner_contacts;
CREATE POLICY "Authorized users can view partner contacts"
ON public.partner_contacts
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'partner'::user_role)
);

-- Secure manual_players table (contact information protection)
ALTER TABLE public.manual_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff and coaches can view manual players" ON public.manual_players;
CREATE POLICY "Staff and coaches can view manual players"
ON public.manual_players
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role)
);

-- Secure payslips table (financial data protection)
-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'payslips' AND schemaname = 'public'
  ) THEN
    -- Table doesn't exist, create it with RLS enabled
    CREATE TABLE IF NOT EXISTS public.payslips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL,
      pay_period_id UUID NOT NULL,
      gross_pay NUMERIC NOT NULL DEFAULT 0,
      net_pay NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      created_by UUID NOT NULL
    );
    
    ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Employees can view own payslips"
    ON public.payslips
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.id = payslips.employee_id AND e.user_id = auth.uid()
      )
    );
    
    CREATE POLICY "HR staff can manage all payslips"
    ON public.payslips
    FOR ALL
    USING (
      is_super_admin(auth.uid()) OR 
      (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
    );
  END IF;
END$$;

-- Secure existing employee data with enhanced policies
-- Update employee policies to be more restrictive
DROP POLICY IF EXISTS "Employees can view their basic info only" ON public.employees;
CREATE POLICY "Employees can view basic info only"
ON public.employees  
FOR SELECT
USING (
  auth.uid() = user_id OR
  is_super_admin(auth.uid()) OR
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

-- Enhance RLS on partner_organizations for business data protection
ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners can view partner data safe" ON public.partner_organizations;
CREATE POLICY "Partners can view partner data secure"
ON public.partner_organizations
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR
  has_role(auth.uid(), 'partner'::user_role)
);