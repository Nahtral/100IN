-- Fix search_path for all remaining SECURITY DEFINER functions

-- Fix get_safe_profile_info function
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(profile_id uuid)
RETURNS TABLE(id uuid, display_name text, access_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is authorized to see full contact info
  IF is_super_admin(auth.uid()) OR 
     user_has_permission(auth.uid(), 'manage_users') OR
     auth.uid() = profile_id THEN
    -- Return full access if authorized
    RETURN QUERY
    SELECT p.id, p.full_name, 'full_access'::TEXT
    FROM public.profiles p
    WHERE p.id = profile_id;
  ELSE
    -- Return masked info for general access (prevent contact harvesting)
    RETURN QUERY
    SELECT p.id, 
           CASE 
             WHEN LENGTH(p.full_name) > 0 THEN LEFT(p.full_name, 1) || '***'
             ELSE 'User'
           END,
           'limited_access'::TEXT
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
END;
$function$;

-- Fix get_benefit_enrollment_summary function
CREATE OR REPLACE FUNCTION public.get_benefit_enrollment_summary()
RETURNS TABLE(plan_name text, plan_type text, total_enrolled bigint, total_cost numeric, active_enrollments bigint)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    bp.name as plan_name,
    bp.plan_type,
    COUNT(ebe.id) as total_enrolled,
    SUM(COALESCE(ebe.employee_contribution, 0) + COALESCE(ebe.employer_contribution, 0)) as total_cost,
    COUNT(ebe.id) FILTER (WHERE ebe.status = 'active') as active_enrollments
  FROM public.benefit_plans bp
  LEFT JOIN public.employee_benefit_enrollments ebe ON bp.id = ebe.benefit_plan_id
  WHERE bp.is_active = true
  GROUP BY bp.id, bp.name, bp.plan_type
  ORDER BY bp.plan_type, bp.name;
$function$;

-- Fix get_benefit_cost_analysis function
CREATE OR REPLACE FUNCTION public.get_benefit_cost_analysis(report_start_date date DEFAULT date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone), report_end_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(plan_type text, total_employer_cost numeric, total_employee_cost numeric, average_cost_per_employee numeric, enrollment_count bigint)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    bp.plan_type,
    SUM(COALESCE(ebe.employer_contribution, 0)) as total_employer_cost,
    SUM(COALESCE(ebe.employee_contribution, 0)) as total_employee_cost,
    AVG(COALESCE(ebe.employee_contribution, 0) + COALESCE(ebe.employer_contribution, 0)) as average_cost_per_employee,
    COUNT(ebe.id) as enrollment_count
  FROM public.benefit_plans bp
  LEFT JOIN public.employee_benefit_enrollments ebe ON bp.id = ebe.benefit_plan_id
  WHERE ebe.effective_date >= report_start_date 
    AND ebe.effective_date <= report_end_date
    AND ebe.status = 'active'
  GROUP BY bp.plan_type
  ORDER BY total_employer_cost DESC;
$function$;