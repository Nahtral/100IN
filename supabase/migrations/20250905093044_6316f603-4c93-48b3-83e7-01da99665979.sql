-- Fix the remaining function search path issue
-- Update any functions that are missing search_path

-- Check for functions without search_path and fix them
-- Most functions should already be fixed from previous migration, but let's ensure any remaining ones are covered

-- Update functions that might still be missing search_path
ALTER FUNCTION public.cleanup_expired_notifications SET search_path = 'public';
ALTER FUNCTION public.update_team_attendance_stats SET search_path = 'public';
ALTER FUNCTION public.check_rate_limit SET search_path = 'public';
ALTER FUNCTION public.notify_approval_request SET search_path = 'public';
ALTER FUNCTION public.check_auth_rate_limit SET search_path = 'public';
ALTER FUNCTION public.log_employee_data_access SET search_path = 'public';
ALTER FUNCTION public.log_sensitive_operation SET search_path = 'public';
ALTER FUNCTION public.handle_new_player_role SET search_path = 'public';
ALTER FUNCTION public.log_medical_access SET search_path = 'public';
ALTER FUNCTION public.update_schedule_on_approval SET search_path = 'public';
ALTER FUNCTION public.log_player_data_access SET search_path = 'public';
ALTER FUNCTION public.update_player_session_stats SET search_path = 'public';
ALTER FUNCTION public.update_player_shooting_stats SET search_path = 'public';
ALTER FUNCTION public.handle_new_user SET search_path = 'public';
ALTER FUNCTION public.auto_determine_shot_region SET search_path = 'public';
ALTER FUNCTION public.calculate_payslip_totals SET search_path = 'public';
ALTER FUNCTION public.log_profile_access SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column SET search_path = 'public';

-- Make sure our newly created function has proper search_path (it should already be set)
ALTER FUNCTION public.get_active_teams SET search_path = 'public';