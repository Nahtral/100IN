-- Add missing triggers for updated_at functionality
CREATE TRIGGER update_time_off_requests_updated_at
    BEFORE UPDATE ON public.time_off_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_schedules_updated_at
    BEFORE UPDATE ON public.employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check if user is an employee
CREATE OR REPLACE FUNCTION public.is_employee(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE user_id = _user_id
      AND employment_status = 'active'
  )
$function$;

-- Update RLS policies for employee self-service
-- Time off requests - employees can view and create their own
CREATE POLICY "Employees can view their own time off requests" 
ON public.time_off_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = time_off_requests.employee_id 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create their own time off requests" 
ON public.time_off_requests 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = time_off_requests.employee_id 
    AND e.user_id = auth.uid()
  )
);

-- Employee schedules - employees can view their own
CREATE POLICY "Employees can view their own schedules" 
ON public.employee_schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_schedules.employee_id 
    AND e.user_id = auth.uid()
  )
);

-- Coaches can view schedules for their team members
CREATE POLICY "Coaches can view team member schedules" 
ON public.employee_schedules 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach') AND
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.players p ON e.user_id = p.user_id
    JOIN public.teams t ON p.team_id = t.id
    WHERE e.id = employee_schedules.employee_id 
    AND t.coach_id = auth.uid()
  )
);

-- Coaches can view time off requests for their team members
CREATE POLICY "Coaches can view team member time off requests" 
ON public.time_off_requests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'coach') AND
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.players p ON e.user_id = p.user_id
    JOIN public.teams t ON p.team_id = t.id
    WHERE e.id = time_off_requests.employee_id 
    AND t.coach_id = auth.uid()
  )
);