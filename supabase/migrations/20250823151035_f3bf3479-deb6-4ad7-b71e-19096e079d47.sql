-- Fix search_path for trigger functions

-- Fix update_schedule_on_approval function
CREATE OR REPLACE FUNCTION public.update_schedule_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;