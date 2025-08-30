-- Fix remaining security definer functions that are missing search_path
CREATE OR REPLACE FUNCTION public.calculate_payslip_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.generate_payslips_for_period(period_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;