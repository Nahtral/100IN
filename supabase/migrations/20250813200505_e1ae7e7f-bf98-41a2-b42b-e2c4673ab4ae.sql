-- Create medical organizations table
CREATE TABLE public.medical_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL DEFAULT 'clinic',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address JSONB,
  license_number TEXT,
  license_expiry_date DATE,
  specialties TEXT[],
  partnership_type TEXT NOT NULL DEFAULT 'preferred_provider',
  partnership_status TEXT NOT NULL DEFAULT 'active',
  contract_start_date DATE,
  contract_end_date DATE,
  partnership_value NUMERIC,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins and medical staff can manage medical organizations" 
ON public.medical_organizations 
FOR ALL 
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'medical'::user_role));

-- Create medical agreements table
CREATE TABLE public.medical_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_organization_id UUID REFERENCES public.medical_organizations(id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL DEFAULT 'service_contract',
  agreement_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_fee NUMERIC,
  per_visit_fee NUMERIC,
  emergency_fee NUMERIC,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  auto_renewal BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_agreements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins and medical staff can manage medical agreements" 
ON public.medical_agreements 
FOR ALL 
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'medical'::user_role));

-- Create update trigger for timestamps
CREATE TRIGGER update_medical_organizations_updated_at
BEFORE UPDATE ON public.medical_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_agreements_updated_at
BEFORE UPDATE ON public.medical_agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();