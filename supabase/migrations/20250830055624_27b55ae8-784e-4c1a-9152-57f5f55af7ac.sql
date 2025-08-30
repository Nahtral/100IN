-- Create payroll_periods table
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'processed', 'closed')),
  total_gross_pay DECIMAL(12,2) DEFAULT 0,
  total_net_pay DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  total_taxes DECIMAL(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(period_name, start_date)
);

-- Enable RLS
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

-- Create policies for payroll_periods
CREATE POLICY "Super admins can manage all payroll periods" 
ON public.payroll_periods 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view payroll periods" 
ON public.payroll_periods 
FOR SELECT 
USING (public.has_role(auth.uid(), 'staff'::user_role));

-- Update payslips table if it doesn't have proper structure
DO $$ 
BEGIN
  -- Add missing columns to payslips if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'payroll_period_id') THEN
    ALTER TABLE public.payslips ADD COLUMN payroll_period_id UUID REFERENCES public.payroll_periods(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'employee_id') THEN
    ALTER TABLE public.payslips ADD COLUMN employee_id UUID REFERENCES public.employees(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'gross_pay') THEN
    ALTER TABLE public.payslips ADD COLUMN gross_pay DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'net_pay') THEN
    ALTER TABLE public.payslips ADD COLUMN net_pay DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'total_deductions') THEN
    ALTER TABLE public.payslips ADD COLUMN total_deductions DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'pay_date') THEN
    ALTER TABLE public.payslips ADD COLUMN pay_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'hours_worked') THEN
    ALTER TABLE public.payslips ADD COLUMN hours_worked DECIMAL(8,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'hourly_rate') THEN
    ALTER TABLE public.payslips ADD COLUMN hourly_rate DECIMAL(8,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'status') THEN
    ALTER TABLE public.payslips ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled'));
  END IF;
END $$;

-- Create payroll_settings table
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for payroll_settings
CREATE POLICY "Super admins can manage payroll settings" 
ON public.payroll_settings 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

-- Create payroll deduction types table
CREATE TABLE IF NOT EXISTS public.payroll_deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_tax BOOLEAN DEFAULT false,
  is_mandatory BOOLEAN DEFAULT false,
  calculation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage')),
  default_rate DECIMAL(8,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_deduction_types ENABLE ROW LEVEL SECURITY;

-- Create policies for payroll_deduction_types
CREATE POLICY "Super admins can manage deduction types" 
ON public.payroll_deduction_types 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view deduction types" 
ON public.payroll_deduction_types 
FOR SELECT 
USING (public.has_role(auth.uid(), 'staff'::user_role) OR public.has_role(auth.uid(), 'coach'::user_role));

-- Create payslip_deductions table
CREATE TABLE IF NOT EXISTS public.payslip_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID REFERENCES public.payslips(id) ON DELETE CASCADE,
  deduction_type_id UUID REFERENCES public.payroll_deduction_types(id),
  amount DECIMAL(10,2) NOT NULL,
  calculation_base DECIMAL(10,2),
  rate DECIMAL(8,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payslip_deductions ENABLE ROW LEVEL SECURITY;

-- Create policies for payslip_deductions
CREATE POLICY "Super admins can manage payslip deductions" 
ON public.payslip_deductions 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view payslip deductions" 
ON public.payslip_deductions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'staff'::user_role));

-- Insert default deduction types
INSERT INTO public.payroll_deduction_types (name, description, is_tax, is_mandatory, calculation_type, default_rate) VALUES
('Income Tax', 'National income tax deduction', true, true, 'percentage', 0.10),
('Health Insurance', 'Employee health insurance contribution', false, true, 'percentage', 0.05),
('Pension Contribution', 'Employee pension fund contribution', false, true, 'percentage', 0.08),
('Unemployment Insurance', 'Unemployment insurance premium', true, true, 'percentage', 0.02)
ON CONFLICT DO NOTHING;

-- Insert default payroll settings
INSERT INTO public.payroll_settings (setting_key, setting_value, description) VALUES
('default_currency', '"¥"', 'Default currency symbol for payroll'),
('pay_frequency', '"monthly"', 'Default pay frequency (weekly, bi-weekly, monthly)'),
('overtime_rate_multiplier', '1.5', 'Overtime rate multiplier (e.g., 1.5 for time-and-a-half)'),
('standard_work_hours_per_day', '8', 'Standard work hours per day'),
('standard_work_days_per_week', '5', 'Standard work days per week')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to calculate payslip totals
CREATE OR REPLACE FUNCTION public.calculate_payslip_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total deductions for the payslip
  UPDATE public.payslips 
  SET total_deductions = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.payslip_deductions 
    WHERE payslip_id = NEW.payslip_id
  ),
  net_pay = gross_pay - (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.payslip_deductions 
    WHERE payslip_id = NEW.payslip_id
  ),
  updated_at = now()
  WHERE id = NEW.payslip_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically calculate payslip totals
DROP TRIGGER IF EXISTS calculate_payslip_totals_trigger ON public.payslip_deductions;
CREATE TRIGGER calculate_payslip_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payslip_deductions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_payslip_totals();

-- Create function to generate payslips for a payroll period
CREATE OR REPLACE FUNCTION public.generate_payslips_for_period(period_id UUID)
RETURNS JSON AS $$
DECLARE
  period_record RECORD;
  employee_record RECORD;
  payslip_id UUID;
  total_hours DECIMAL(8,2);
  gross_amount DECIMAL(10,2);
  result JSON;
  payslips_created INTEGER := 0;
BEGIN
  -- Get payroll period details
  SELECT * INTO period_record FROM public.payroll_periods WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payroll period not found');
  END IF;
  
  -- Loop through active employees
  FOR employee_record IN 
    SELECT * FROM public.employees 
    WHERE employment_status = 'active'
  LOOP
    -- Calculate total hours worked in the period
    SELECT COALESCE(SUM(total_hours), 0) INTO total_hours
    FROM public.time_entries te
    WHERE te.employee_id = employee_record.id
      AND te.clock_in::date BETWEEN period_record.start_date AND period_record.end_date;
    
    -- Calculate gross pay
    IF employee_record.payment_type = 'hourly' THEN
      gross_amount := total_hours * COALESCE(employee_record.hourly_rate, 0);
    ELSE
      -- For salary employees, use monthly salary divided by working days
      gross_amount := COALESCE(employee_record.salary, 0) / 12; -- Monthly portion
    END IF;
    
    -- Create payslip
    INSERT INTO public.payslips (
      employee_id,
      payroll_period_id,
      hours_worked,
      hourly_rate,
      gross_pay,
      net_pay,
      pay_date,
      status,
      created_at
    ) VALUES (
      employee_record.id,
      period_id,
      total_hours,
      employee_record.hourly_rate,
      gross_amount,
      gross_amount, -- Will be updated by deductions
      period_record.pay_date,
      'draft',
      now()
    ) RETURNING id INTO payslip_id;
    
    -- Add default deductions
    INSERT INTO public.payslip_deductions (payslip_id, deduction_type_id, amount, calculation_base, rate)
    SELECT 
      payslip_id,
      pdt.id,
      CASE 
        WHEN pdt.calculation_type = 'percentage' THEN 
          ROUND(gross_amount * pdt.default_rate, 2)
        ELSE 
          pdt.default_rate
      END,
      gross_amount,
      pdt.default_rate
    FROM public.payroll_deduction_types pdt
    WHERE pdt.is_active = true AND pdt.is_mandatory = true;
    
    payslips_created := payslips_created + 1;
  END LOOP;
  
  -- Update payroll period status
  UPDATE public.payroll_periods 
  SET 
    status = 'processed',
    updated_at = now()
  WHERE id = period_id;
  
  result := json_build_object(
    'success', true, 
    'payslips_created', payslips_created,
    'period_name', period_record.period_name
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_payroll_periods_updated_at ON public.payroll_periods;
CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_settings_updated_at ON public.payroll_settings;
CREATE TRIGGER update_payroll_settings_updated_at
  BEFORE UPDATE ON public.payroll_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_deduction_types_updated_at ON public.payroll_deduction_types;
CREATE TRIGGER update_payroll_deduction_types_updated_at
  BEFORE UPDATE ON public.payroll_deduction_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();