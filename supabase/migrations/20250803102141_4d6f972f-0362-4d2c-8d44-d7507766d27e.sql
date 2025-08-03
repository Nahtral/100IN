-- Create employees table for HR management
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  position TEXT NOT NULL,
  hire_date DATE NOT NULL,
  termination_date DATE,
  employment_status TEXT NOT NULL DEFAULT 'active',
  hourly_rate NUMERIC(10,2),
  salary NUMERIC(10,2),
  payment_type TEXT NOT NULL DEFAULT 'hourly',
  manager_id UUID REFERENCES public.employees(id),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address JSONB,
  benefits_eligible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create time_entries table for tracking hours
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_duration_minutes INTEGER DEFAULT 0,
  total_hours NUMERIC(4,2),
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  entry_type TEXT NOT NULL DEFAULT 'regular',
  notes TEXT,
  approved_by UUID,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_off_requests table
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(3,1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  denial_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_benefits table
CREATE TABLE public.employee_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  coverage_start_date DATE NOT NULL,
  coverage_end_date DATE,
  employee_contribution NUMERIC(10,2),
  employer_contribution NUMERIC(10,2),
  dependents JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll_periods table
CREATE TABLE public.payroll_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross_pay NUMERIC(12,2) DEFAULT 0,
  total_net_pay NUMERIC(12,2) DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payslips table
CREATE TABLE public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  regular_hours NUMERIC(6,2) DEFAULT 0,
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  gross_pay NUMERIC(10,2) NOT NULL,
  net_pay NUMERIC(10,2) NOT NULL,
  tax_deductions NUMERIC(10,2) DEFAULT 0,
  benefit_deductions NUMERIC(10,2) DEFAULT 0,
  other_deductions NUMERIC(10,2) DEFAULT 0,
  bonuses NUMERIC(10,2) DEFAULT 0,
  deduction_details JSONB DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft'
);

-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID NOT NULL,
  expiry_date DATE,
  is_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create onboarding_tasks table
CREATE TABLE public.onboarding_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_description TEXT,
  assigned_to UUID,
  due_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  task_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees table
CREATE POLICY "Super admins and staff can manage all employees"
ON public.employees FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Coaches and employees can view employee data"
ON public.employees FOR SELECT
USING (
  has_role(auth.uid(), 'coach'::user_role) OR 
  auth.uid() = user_id OR
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role)
);

-- RLS Policies for time_entries table
CREATE POLICY "Staff and super admins can manage all time entries"
ON public.time_entries FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Employees can manage their own time entries"
ON public.time_entries FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = time_entries.employee_id AND e.user_id = auth.uid()
));

-- RLS Policies for time_off_requests table
CREATE POLICY "Staff and super admins can manage all time off requests"
ON public.time_off_requests FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Employees can manage their own time off requests"
ON public.time_off_requests FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = time_off_requests.employee_id AND e.user_id = auth.uid()
));

-- RLS Policies for employee_benefits table
CREATE POLICY "Staff and super admins can manage all benefits"
ON public.employee_benefits FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Employees can view their own benefits"
ON public.employee_benefits FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_benefits.employee_id AND e.user_id = auth.uid()
));

-- RLS Policies for payroll_periods table
CREATE POLICY "Staff and super admins can manage payroll periods"
ON public.payroll_periods FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

-- RLS Policies for payslips table
CREATE POLICY "Staff and super admins can manage all payslips"
ON public.payslips FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Employees can view their own payslips"
ON public.payslips FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = payslips.employee_id AND e.user_id = auth.uid()
));

-- RLS Policies for employee_documents table
CREATE POLICY "Staff and super admins can manage all documents"
ON public.employee_documents FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Employees can view their own non-confidential documents"
ON public.employee_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_documents.employee_id AND e.user_id = auth.uid()
) AND is_confidential = false);

-- RLS Policies for onboarding_tasks table
CREATE POLICY "Staff and super admins can manage all onboarding tasks"
ON public.onboarding_tasks FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role) OR has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Employees can view their own onboarding tasks"
ON public.onboarding_tasks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = onboarding_tasks.employee_id AND e.user_id = auth.uid()
));

-- Add triggers for updated_at columns
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_benefits_updated_at
  BEFORE UPDATE ON public.employee_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();