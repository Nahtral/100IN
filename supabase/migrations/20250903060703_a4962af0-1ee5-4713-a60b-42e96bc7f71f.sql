-- Create employee records for coaches, staff, and super admins who don't have them
-- This allows them to be scheduled using the existing employee_schedules table

WITH ordered_profiles AS (
  SELECT DISTINCT
    p.id as user_id,
    p.full_name,
    p.email,
    ur.role,
    ROW_NUMBER() OVER (ORDER BY p.full_name) as row_num
  FROM profiles p
  INNER JOIN user_roles ur ON p.id = ur.user_id
  LEFT JOIN employees e ON p.id = e.user_id
  WHERE ur.is_active = true
    AND ur.role IN ('super_admin', 'staff', 'coach')
    AND p.approval_status = 'approved'
    AND e.id IS NULL  -- Only insert if no employee record exists
)
INSERT INTO public.employees (
  user_id,
  employee_id,
  first_name,
  last_name,
  email,
  position,
  department,
  hire_date,
  employment_status,
  payment_type,
  created_by,
  created_at,
  updated_at
)
SELECT 
  op.user_id,
  'EMP-' || UPPER(SUBSTRING(op.full_name FROM 1 FOR 3)) || '-' || EXTRACT(YEAR FROM NOW()) || LPAD(op.row_num::text, 3, '0') as employee_id,
  SPLIT_PART(op.full_name, ' ', 1) as first_name,
  CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(op.full_name, ' '), 1) > 1 
    THEN SUBSTRING(op.full_name FROM LENGTH(SPLIT_PART(op.full_name, ' ', 1)) + 2)
    ELSE op.full_name
  END as last_name,
  op.email,
  CASE 
    WHEN op.role = 'super_admin' THEN 'CEO/Super Admin'
    WHEN op.role = 'staff' THEN 'Staff Member'
    WHEN op.role = 'coach' THEN 'Basketball Coach'
    ELSE 'Team Member'
  END as position,
  CASE 
    WHEN op.role = 'super_admin' THEN 'Administration'
    WHEN op.role = 'staff' THEN 'Operations'
    WHEN op.role = 'coach' THEN 'Coaching'
    ELSE 'General'
  END as department,
  CURRENT_DATE as hire_date,
  'active' as employment_status,
  'salary' as payment_type,
  (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1) as created_by,
  NOW() as created_at,
  NOW() as updated_at
FROM ordered_profiles op;

-- Log the employee creation for coaches, staff, and super admins
INSERT INTO public.analytics_events (
  event_type,
  event_data,
  user_id,
  created_at
) VALUES (
  'employee_records_created',
  jsonb_build_object(
    'action', 'auto_create_employee_records',
    'reason', 'enable_scheduling_for_coaches_staff_superadmin',
    'affected_roles', jsonb_build_array('super_admin', 'staff', 'coach'),
    'created_count', (
      SELECT COUNT(*)
      FROM employees e
      INNER JOIN profiles p ON e.user_id = p.id
      INNER JOIN user_roles ur ON p.id = ur.user_id
      WHERE ur.role IN ('super_admin', 'staff', 'coach')
        AND e.created_at >= NOW() - INTERVAL '5 minutes'
    )
  ),
  (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1),
  NOW()
);