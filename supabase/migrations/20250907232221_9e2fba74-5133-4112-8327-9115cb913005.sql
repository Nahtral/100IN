-- Add missing RPC functions
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