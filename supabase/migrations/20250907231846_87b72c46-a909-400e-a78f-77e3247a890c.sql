-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Employees can view their own onboarding tasks" ON public.onboarding_tasks;

-- Create missing tables for staff management system
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
CREATE POLICY "Staff can view their own onboarding tasks" ON public.onboarding_tasks
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