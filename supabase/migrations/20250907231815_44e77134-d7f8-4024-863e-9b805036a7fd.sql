-- Create missing tables for staff management system

-- Time entries table for time tracking
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_hours DECIMAL(8,2),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'break', 'completed')),
  location TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee leave requests table
CREATE TABLE IF NOT EXISTS public.employee_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'family', 'bereavement', 'jury_duty')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  days_requested INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Onboarding tasks table
CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_description TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_required BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'hr', 'it', 'training', 'compliance')),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_entries
CREATE POLICY "Employees can view their own time entries" ON public.time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = time_entries.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR staff can view all time entries" ON public.time_entries
  FOR SELECT USING (
    is_super_admin(auth.uid()) OR 
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
  );

CREATE POLICY "HR staff can manage time entries" ON public.time_entries
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
  );

-- RLS policies for employee_leave_requests
CREATE POLICY "Employees can view their own leave requests" ON public.employee_leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = employee_leave_requests.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create their own leave requests" ON public.employee_leave_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = employee_leave_requests.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR staff can manage all leave requests" ON public.employee_leave_requests
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
  );

-- RLS policies for onboarding_tasks
CREATE POLICY "Employees can view their own onboarding tasks" ON public.onboarding_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = onboarding_tasks.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "HR staff can manage all onboarding tasks" ON public.onboarding_tasks
  FOR ALL USING (
    is_super_admin(auth.uid()) OR 
    (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON public.time_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.employee_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.employee_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee_id ON public.onboarding_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON public.onboarding_tasks(status);

-- Create RPC functions for staff operations
CREATE OR REPLACE FUNCTION public.get_staff_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only super admins and authorized staff can access analytics
  IF NOT (is_super_admin(auth.uid()) OR 
          (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_staff', (SELECT COUNT(*) FROM public.employees WHERE employment_status = 'active'),
    'active_staff', (SELECT COUNT(*) FROM public.employees WHERE employment_status = 'active'),
    'total_departments', (SELECT COUNT(*) FROM public.staff_departments WHERE is_active = true),
    'avg_staff_per_department', (
      SELECT ROUND(AVG(staff_count), 1) FROM (
        SELECT COUNT(e.id) as staff_count
        FROM public.staff_departments d
        LEFT JOIN public.employees e ON d.name = e.department AND e.employment_status = 'active'
        WHERE d.is_active = true
        GROUP BY d.id
      ) AS dept_counts
    ),
    'department_distribution', (
      SELECT json_agg(
        json_build_object(
          'department', d.name,
          'count', COALESCE(dept_stats.staff_count, 0),
          'budget', d.budget_allocation
        )
      )
      FROM public.staff_departments d
      LEFT JOIN (
        SELECT department, COUNT(*) as staff_count
        FROM public.employees
        WHERE employment_status = 'active'
        GROUP BY department
      ) dept_stats ON d.name = dept_stats.department
      WHERE d.is_active = true
      ORDER BY COALESCE(dept_stats.staff_count, 0) DESC
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to create staff member with proper validation
CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_department TEXT,
  p_position TEXT,
  p_hire_date DATE DEFAULT CURRENT_DATE,
  p_payment_type TEXT DEFAULT 'hourly',
  p_hourly_rate NUMERIC DEFAULT NULL,
  p_salary NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_employee_id UUID;
  employee_code TEXT;
BEGIN
  -- Only super admins and authorized staff can create employees
  IF NOT (is_super_admin(auth.uid()) OR 
          (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Generate unique employee code
  employee_code := 'EMP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((
    SELECT COUNT(*) + 1 FROM public.employees WHERE employee_id LIKE 'EMP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
  )::TEXT, 4, '0');

  -- Insert new employee
  INSERT INTO public.employees (
    employee_id,
    first_name,
    last_name,
    email,
    phone,
    department,
    position,
    hire_date,
    payment_type,
    hourly_rate,
    salary,
    employment_status,
    created_by
  ) VALUES (
    employee_code,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_department,
    p_position,
    p_hire_date,
    p_payment_type,
    p_hourly_rate,
    p_salary,
    'active',
    auth.uid()
  ) RETURNING id INTO new_employee_id;

  RETURN new_employee_id;
END;
$$;