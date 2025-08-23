-- Create employee scheduling tables
CREATE TABLE public.employee_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 0,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedule change requests table
CREATE TABLE public.schedule_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  original_schedule_id UUID REFERENCES public.employee_schedules(id) ON DELETE CASCADE,
  new_schedule_data JSONB NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('time_change', 'date_change', 'swap', 'cancellation')),
  target_employee_id UUID REFERENCES public.employees(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'withdrawn')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift templates for recurring schedules
CREATE TABLE public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 0,
  days_of_week INTEGER[] NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_schedules
CREATE POLICY "Employees can view their own schedules"
ON public.employee_schedules
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.employees e 
  WHERE e.id = employee_schedules.employee_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "HR staff can manage all schedules"
ON public.employee_schedules
FOR ALL
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

-- RLS Policies for schedule_change_requests
CREATE POLICY "Employees can manage their own requests"
ON public.schedule_change_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.user_id = auth.uid() 
    AND (e.id = requester_id OR e.id = target_employee_id)
  ) OR
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

-- RLS Policies for shift_templates
CREATE POLICY "HR staff can manage shift templates"
ON public.shift_templates
FOR ALL
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

CREATE POLICY "All staff can view shift templates"
ON public.shift_templates
FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Create function to auto-update schedules when requests are approved
CREATE OR REPLACE FUNCTION public.update_schedule_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    CASE NEW.request_type
      WHEN 'time_change', 'date_change' THEN
        -- Update the original schedule with new data
        UPDATE public.employee_schedules
        SET 
          shift_date = COALESCE((NEW.new_schedule_data->>'shift_date')::DATE, shift_date),
          start_time = COALESCE((NEW.new_schedule_data->>'start_time')::TIME, start_time),
          end_time = COALESCE((NEW.new_schedule_data->>'end_time')::TIME, end_time),
          location = COALESCE(NEW.new_schedule_data->>'location', location),
          notes = COALESCE(NEW.new_schedule_data->>'notes', notes),
          updated_at = now()
        WHERE id = NEW.original_schedule_id;
        
      WHEN 'cancellation' THEN
        -- Cancel the original schedule
        UPDATE public.employee_schedules
        SET status = 'cancelled', updated_at = now()
        WHERE id = NEW.original_schedule_id;
        
      WHEN 'swap' THEN
        -- Handle schedule swap between employees
        IF NEW.target_employee_id IS NOT NULL THEN
          -- Create new schedule for target employee with requester's original schedule
          INSERT INTO public.employee_schedules (
            employee_id, shift_date, start_time, end_time, 
            break_duration_minutes, location, notes, created_by
          )
          SELECT 
            NEW.target_employee_id,
            shift_date, start_time, end_time,
            break_duration_minutes, location, 
            'Swapped from employee', 
            NEW.reviewed_by
          FROM public.employee_schedules 
          WHERE id = NEW.original_schedule_id;
          
          -- Update original schedule with new employee data
          UPDATE public.employee_schedules
          SET 
            employee_id = (
              SELECT e.id FROM public.employees e 
              WHERE e.user_id = NEW.requester_id
            ),
            notes = COALESCE(NEW.new_schedule_data->>'notes', 'Schedule swap'),
            updated_at = now()
          WHERE id = NEW.original_schedule_id;
        END IF;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-updating schedules
CREATE TRIGGER update_schedule_on_approval_trigger
  AFTER UPDATE ON public.schedule_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_on_approval();

-- Create function to update updated_at timestamps
CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_change_requests_updated_at
  BEFORE UPDATE ON public.schedule_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();