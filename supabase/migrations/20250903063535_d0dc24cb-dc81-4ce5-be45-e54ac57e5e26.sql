-- Add missing foreign key relationships for employee scheduling system

-- First, let's add a foreign key relationship between employees and profiles
-- This assumes employees.user_id should reference profiles.id
DO $$ 
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_user_id_fkey' 
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE public.employees 
    ADD CONSTRAINT employees_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key relationship between schedule_change_requests and employees
-- Check if the schedule_change_requests table exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_change_requests') THEN
    -- Add foreign key for requester_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'schedule_change_requests_requester_id_fkey' 
      AND table_name = 'schedule_change_requests'
    ) THEN
      ALTER TABLE public.schedule_change_requests 
      ADD CONSTRAINT schedule_change_requests_requester_id_fkey 
      FOREIGN KEY (requester_id) REFERENCES public.employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for target_employee_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'schedule_change_requests_target_employee_id_fkey' 
      AND table_name = 'schedule_change_requests'
    ) THEN
      ALTER TABLE public.schedule_change_requests 
      ADD CONSTRAINT schedule_change_requests_target_employee_id_fkey 
      FOREIGN KEY (target_employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for original_schedule_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'schedule_change_requests_original_schedule_id_fkey' 
      AND table_name = 'schedule_change_requests'
    ) THEN
      ALTER TABLE public.schedule_change_requests 
      ADD CONSTRAINT schedule_change_requests_original_schedule_id_fkey 
      FOREIGN KEY (original_schedule_id) REFERENCES public.employee_schedules(id) ON DELETE CASCADE;
    END IF;
  ELSE
    -- Create the schedule_change_requests table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.schedule_change_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
      target_employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
      original_schedule_id uuid REFERENCES public.employee_schedules(id) ON DELETE CASCADE,
      request_type text NOT NULL CHECK (request_type IN ('time_change', 'date_change', 'cancellation', 'swap')),
      new_schedule_data jsonb,
      reason text,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by uuid REFERENCES public.employees(id),
      reviewed_at timestamp with time zone,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );
    
    -- Enable RLS on the new table
    ALTER TABLE public.schedule_change_requests ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies for schedule change requests
    CREATE POLICY "Employees can view their own requests" ON public.schedule_change_requests
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.employees e 
          WHERE e.id = schedule_change_requests.requester_id 
          AND e.user_id = auth.uid()
        )
      );
    
    CREATE POLICY "Employees can create requests" ON public.schedule_change_requests
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.employees e 
          WHERE e.id = schedule_change_requests.requester_id 
          AND e.user_id = auth.uid()
        )
      );
    
    CREATE POLICY "HR staff can manage all requests" ON public.schedule_change_requests
      FOR ALL USING (
        is_super_admin(auth.uid()) OR 
        (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
      );
  END IF;
END $$;

-- Add foreign key relationship between employee_schedules and employees if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employee_schedules_employee_id_fkey' 
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE public.employee_schedules 
    ADD CONSTRAINT employee_schedules_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
END $$;