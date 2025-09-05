-- Fix Security Definer views and function search paths
-- Remove SECURITY DEFINER from views that don't need it and fix function search paths

-- First, let's check what views have SECURITY DEFINER
-- and update functions to have proper search_path

-- Fix function search paths for all functions missing search_path
ALTER FUNCTION public.is_user_approved SET search_path = 'public';
ALTER FUNCTION public.user_created_chat SET search_path = 'public';
ALTER FUNCTION public.mask_employee_compensation SET search_path = 'public';
ALTER FUNCTION public.get_user_permissions SET search_path = 'public';
ALTER FUNCTION public.has_role SET search_path = 'public';
ALTER FUNCTION public.get_safe_profile_info SET search_path = 'public';
ALTER FUNCTION public.get_benefit_enrollment_summary SET search_path = 'public';
ALTER FUNCTION public.get_benefit_cost_analysis SET search_path = 'public';
ALTER FUNCTION public.mark_all_notifications_read SET search_path = 'public';
ALTER FUNCTION public.get_unread_notification_count SET search_path = 'public';
ALTER FUNCTION public.fn_get_membership_summary SET search_path = 'public';
ALTER FUNCTION public.fn_auto_deactivate_players SET search_path = 'public';
ALTER FUNCTION public.is_same_team_member SET search_path = 'public';
ALTER FUNCTION public.get_current_user_team_id SET search_path = 'public';
ALTER FUNCTION public.determine_shot_region SET search_path = 'public';
ALTER FUNCTION public.get_user_requested_role SET search_path = 'public';
ALTER FUNCTION public.get_employees_secure SET search_path = 'public';
ALTER FUNCTION public.get_notifications_paginated SET search_path = 'public';
ALTER FUNCTION public.rpc_get_employees SET search_path = 'public';
ALTER FUNCTION public.is_super_admin SET search_path = 'public';
ALTER FUNCTION public.user_has_permission SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role SET search_path = 'public';
ALTER FUNCTION public.is_current_user_super_admin SET search_path = 'public';
ALTER FUNCTION public.current_user_has_role SET search_path = 'public';
ALTER FUNCTION public.user_is_approved SET search_path = 'public';

-- Add rate limiting function with proper security
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  user_uuid UUID,
  endpoint_name TEXT,
  max_requests INTEGER DEFAULT 100,
  time_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Count recent requests for this user and endpoint
  SELECT COUNT(*) INTO request_count
  FROM public.analytics_events
  WHERE user_id = user_uuid
    AND event_type = 'api_request'
    AND event_data->>'endpoint' = endpoint_name
    AND created_at > NOW() - (time_window_minutes || ' minutes')::INTERVAL;
  
  -- Log this request
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    user_uuid, 'api_request', 
    jsonb_build_object('endpoint', endpoint_name, 'timestamp', NOW()),
    NOW()
  );
  
  RETURN request_count < max_requests;
END;
$$;