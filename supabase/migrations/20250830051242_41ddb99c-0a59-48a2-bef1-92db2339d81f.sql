-- Create medical insurance table for players
CREATE TABLE public.player_medical_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  insurance_provider TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  group_number TEXT,
  policy_holder_name TEXT NOT NULL,
  policy_holder_relationship TEXT NOT NULL,
  effective_date DATE NOT NULL,
  expiration_date DATE,
  copay_amount NUMERIC,
  deductible_amount NUMERIC,
  out_of_pocket_max NUMERIC,
  coverage_details TEXT,
  provider_phone TEXT,
  provider_address TEXT,
  emergency_coverage BOOLEAN DEFAULT true,
  dental_coverage BOOLEAN DEFAULT false,
  vision_coverage BOOLEAN DEFAULT false,
  prescription_coverage BOOLEAN DEFAULT false,
  pre_authorization_required BOOLEAN DEFAULT false,
  notes TEXT,
  is_primary BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.player_medical_insurance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Medical staff can manage all insurance data"
ON public.player_medical_insurance
FOR ALL
USING (
  has_role(auth.uid(), 'medical'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Players can view their own insurance data"
ON public.player_medical_insurance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.id = player_medical_insurance.player_id
    AND players.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view their children's insurance data"
ON public.player_medical_insurance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.parent_child_relationships pcr ON p.user_id = pcr.child_id
    WHERE p.id = player_medical_insurance.player_id
    AND pcr.parent_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_player_medical_insurance_updated_at
  BEFORE UPDATE ON public.player_medical_insurance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Log medical data access for compliance
CREATE TRIGGER log_insurance_access
  AFTER SELECT ON public.player_medical_insurance
  FOR EACH ROW
  EXECUTE FUNCTION public.log_medical_access();

-- Create index for better performance
CREATE INDEX idx_player_medical_insurance_player_id ON public.player_medical_insurance(player_id);
CREATE INDEX idx_player_medical_insurance_is_primary ON public.player_medical_insurance(player_id, is_primary) WHERE is_primary = true;