-- Add description column to shift_templates for better template management
ALTER TABLE public.shift_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- Insert some default shift templates with integer day representations
-- (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)
INSERT INTO public.shift_templates (
  template_name, 
  description,
  department, 
  position, 
  start_time, 
  end_time, 
  break_duration_minutes, 
  days_of_week, 
  location, 
  created_by
) VALUES 
(
  'Morning Shift', 
  'Standard morning shift for general staff',
  'General', 
  'Staff', 
  '08:00', 
  '16:00', 
  60, 
  ARRAY[1, 2, 3, 4, 5], -- Monday to Friday
  'Main Office',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Evening Shift',
  'Standard evening shift for extended coverage', 
  'General', 
  'Staff', 
  '16:00', 
  '00:00', 
  45, 
  ARRAY[1, 2, 3, 4, 5], -- Monday to Friday
  'Main Office',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Weekend Day Shift',
  'Weekend coverage for essential operations',
  'General', 
  'Staff', 
  '09:00', 
  '17:00', 
  60, 
  ARRAY[6, 0], -- Saturday and Sunday
  'Main Office',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Coaching Session',
  'Standard coaching and training session',
  'Sports', 
  'Coach', 
  '15:00', 
  '19:00', 
  30, 
  ARRAY[1, 3, 5], -- Monday, Wednesday, Friday
  'Training Facility',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Medical Coverage',
  'Medical staff availability during training',
  'Medical', 
  'Medical Staff', 
  '14:00', 
  '20:00', 
  45, 
  ARRAY[1, 2, 3, 4, 5], -- Monday to Friday
  'Medical Center',
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT DO NOTHING;