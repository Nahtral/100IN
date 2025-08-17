-- EMERGENCY SECURITY FIX: Implement strict RLS policies to protect sensitive data

-- 1. FIX PROFILES TABLE - Remove any overly permissive policies
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;

-- Create secure profiles access with limited data exposure
CREATE OR REPLACE FUNCTION public.get_safe_profile_info(profile_id uuid)
RETURNS TABLE(id uuid, display_name text, access_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- 2. FIX EMPLOYEES TABLE - Highly sensitive HR data
DROP POLICY IF EXISTS "All authenticated users can view employees" ON public.employees;
CREATE POLICY "Employees can view their own data" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins and HR can view all employee data" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees')));

-- 3. FIX MEDICAL TABLES - HIPAA compliance
DROP POLICY IF EXISTS "All authenticated users can view medical data" ON public.daily_health_checkins;
DROP POLICY IF EXISTS "All authenticated users can view medical data" ON public.health_wellness;

-- Daily health checkins - only patient, parents, and medical staff
CREATE POLICY "Medical staff can view all health check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'medical'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Players can view their own check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM players 
  WHERE players.id = daily_health_checkins.player_id 
  AND players.user_id = auth.uid()
));

CREATE POLICY "Parents can view their children's check-ins" 
ON public.daily_health_checkins 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM players p
  JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
  WHERE p.id = daily_health_checkins.player_id 
  AND pcr.parent_id = auth.uid()
));

-- 4. FIX PLAYERS TABLE - Protect children's data
DROP POLICY IF EXISTS "All authenticated users can view players" ON public.players;

CREATE POLICY "Players can view their own data" 
ON public.players 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their children's data" 
ON public.players 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM parent_child_relationships 
  WHERE parent_child_relationships.parent_id = auth.uid() 
  AND parent_child_relationships.child_id = players.user_id
));

CREATE POLICY "Coaches can view their team players" 
ON public.players 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM teams 
  WHERE teams.id = players.team_id 
  AND teams.coach_id = auth.uid()
));

CREATE POLICY "Staff and super admins can view all players" 
ON public.players 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));