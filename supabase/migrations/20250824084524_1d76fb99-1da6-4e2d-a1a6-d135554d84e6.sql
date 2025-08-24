-- Check if triggers already exist and drop them if they do
DROP TRIGGER IF EXISTS update_time_off_requests_updated_at ON public.time_off_requests;
DROP TRIGGER IF EXISTS update_employee_schedules_updated_at ON public.employee_schedules;
DROP TRIGGER IF EXISTS update_time_entries_updated_at ON public.time_entries;

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