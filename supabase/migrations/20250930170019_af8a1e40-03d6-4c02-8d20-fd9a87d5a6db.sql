-- Phase 1: Critical Database Schema Fixes (with function drop)

-- 1. Drop and recreate rpc_get_employees function with correct return type
DROP FUNCTION IF EXISTS public.rpc_get_employees(text, integer, integer);

CREATE FUNCTION public.rpc_get_employees(
  q text DEFAULT '',
  lim integer DEFAULT 50,
  off integer DEFAULT 0
)
RETURNS TABLE(
  employee_id uuid,
  full_name text,
  email text,
  role text,
  role_display text,
  phone text,
  "position" text,
  department text,
  employment_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    COALESCE(p.full_name, e.first_name || ' ' || e.last_name) as full_name,
    COALESCE(e.email, p.email) as email,
    COALESCE(
      (SELECT ur.role::text 
       FROM user_roles ur 
       WHERE ur.user_id = e.user_id 
         AND ur.is_active = true 
       ORDER BY 
         CASE ur.role::text
           WHEN 'super_admin' THEN 1
           WHEN 'staff' THEN 2
           WHEN 'coach' THEN 3
           ELSE 4
         END
       LIMIT 1),
      'employee'
    ) as role,
    COALESCE(e.position, 'Employee') as role_display,
    e.phone,
    e.position,
    e.department,
    e.employment_status
  FROM employees e
  LEFT JOIN profiles p ON e.user_id = p.id
  WHERE 
    e.employment_status = 'active'
    AND (
      q = '' 
      OR e.first_name ILIKE '%' || q || '%'
      OR e.last_name ILIKE '%' || q || '%'
      OR p.full_name ILIKE '%' || q || '%'
      OR e.email ILIKE '%' || q || '%'
      OR e.position ILIKE '%' || q || '%'
      OR e.department ILIKE '%' || q || '%'
    )
  ORDER BY e.first_name, e.last_name
  LIMIT lim
  OFFSET off;
END;
$$;

-- 2. Ensure foreign key constraint exists between employee_schedules and employees
DO $$ 
BEGIN
  -- Drop existing constraint if it exists with wrong target
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employee_schedules_employee_id_fkey' 
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE employee_schedules DROP CONSTRAINT employee_schedules_employee_id_fkey;
  END IF;

  -- Add correct foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employee_schedules_employee_id_fkey_correct' 
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE employee_schedules 
    ADD CONSTRAINT employee_schedules_employee_id_fkey_correct 
    FOREIGN KEY (employee_id) 
    REFERENCES employees(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Create validation function for employee schedules
CREATE OR REPLACE FUNCTION public.validate_employee_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate employee exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = NEW.employee_id 
    AND employment_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid employee: Employee must exist and be active';
  END IF;

  -- Validate time logic
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Invalid schedule: End time must be after start time';
  END IF;

  -- Check for overlapping schedules
  IF EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_id = NEW.employee_id
    AND shift_date = NEW.shift_date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Schedule conflict: Employee already has a shift at this time';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_employee_schedule_trigger ON employee_schedules;
CREATE TRIGGER validate_employee_schedule_trigger
  BEFORE INSERT OR UPDATE ON employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_schedule();

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date 
ON employee_schedules(employee_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_employees_search 
ON employees(first_name, last_name, email, position, department);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_get_employees TO authenticated;