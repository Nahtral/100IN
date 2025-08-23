-- Create benefit plans table
CREATE TABLE public.benefit_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('health', 'dental', 'vision', 'life', 'retirement', 'other')),
  provider_name TEXT,
  monthly_cost NUMERIC(10,2),
  employee_contribution_percentage NUMERIC(5,2) DEFAULT 0,
  employer_contribution_percentage NUMERIC(5,2) DEFAULT 100,
  coverage_details JSONB DEFAULT '{}',
  eligibility_requirements JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.benefit_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for benefit plans
CREATE POLICY "Super admins and HR staff can manage benefit plans" 
ON public.benefit_plans 
FOR ALL 
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')));

CREATE POLICY "All staff can view benefit plans" 
ON public.benefit_plans 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

-- Create employee benefit enrollments table
CREATE TABLE public.employee_benefit_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  benefit_plan_id UUID NOT NULL REFERENCES public.benefit_plans(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  employee_contribution NUMERIC(10,2),
  employer_contribution NUMERIC(10,2),
  dependent_coverage JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'pending')),
  enrollment_method TEXT DEFAULT 'manual',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, benefit_plan_id, effective_date)
);

-- Enable RLS
ALTER TABLE public.employee_benefit_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for employee benefit enrollments
CREATE POLICY "Super admins and HR staff can manage enrollments" 
ON public.employee_benefit_enrollments 
FOR ALL 
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')));

CREATE POLICY "Employees can view their own enrollments" 
ON public.employee_benefit_enrollments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_benefit_enrollments.employee_id 
  AND e.user_id = auth.uid()
));

-- Create benefit reports table for tracking generated reports
CREATE TABLE public.benefit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('enrollment_summary', 'cost_analysis', 'compliance_report')),
  report_name TEXT NOT NULL,
  report_data JSONB NOT NULL,
  report_period_start DATE,
  report_period_end DATE,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  parameters JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.benefit_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for benefit reports
CREATE POLICY "Super admins and HR staff can manage reports" 
ON public.benefit_reports 
FOR ALL 
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')));

-- Create updated_at triggers
CREATE TRIGGER update_benefit_plans_updated_at
  BEFORE UPDATE ON public.benefit_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_benefit_enrollments_updated_at
  BEFORE UPDATE ON public.employee_benefit_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get benefit enrollment summary
CREATE OR REPLACE FUNCTION public.get_benefit_enrollment_summary()
RETURNS TABLE (
  plan_name TEXT,
  plan_type TEXT,
  total_enrolled BIGINT,
  total_cost NUMERIC,
  active_enrollments BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    bp.name as plan_name,
    bp.plan_type,
    COUNT(ebe.id) as total_enrolled,
    SUM(COALESCE(ebe.employee_contribution, 0) + COALESCE(ebe.employer_contribution, 0)) as total_cost,
    COUNT(ebe.id) FILTER (WHERE ebe.status = 'active') as active_enrollments
  FROM public.benefit_plans bp
  LEFT JOIN public.employee_benefit_enrollments ebe ON bp.id = ebe.benefit_plan_id
  WHERE bp.is_active = true
  GROUP BY bp.id, bp.name, bp.plan_type
  ORDER BY bp.plan_type, bp.name;
$$;

-- Create function to get cost analysis data
CREATE OR REPLACE FUNCTION public.get_benefit_cost_analysis(start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE), end_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  plan_type TEXT,
  total_employer_cost NUMERIC,
  total_employee_cost NUMERIC,
  average_cost_per_employee NUMERIC,
  enrollment_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    bp.plan_type,
    SUM(COALESCE(ebe.employer_contribution, 0)) as total_employer_cost,
    SUM(COALESCE(ebe.employee_contribution, 0)) as total_employee_cost,
    AVG(COALESCE(ebe.employee_contribution, 0) + COALESCE(ebe.employer_contribution, 0)) as average_cost_per_employee,
    COUNT(ebe.id) as enrollment_count
  FROM public.benefit_plans bp
  LEFT JOIN public.employee_benefit_enrollments ebe ON bp.id = ebe.benefit_plan_id
  WHERE ebe.effective_date >= start_date 
    AND ebe.effective_date <= end_date
    AND ebe.status = 'active'
  GROUP BY bp.plan_type
  ORDER BY total_employer_cost DESC;
$$;