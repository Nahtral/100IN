-- Phase 1: Update all RLS policies to remove dependencies on players.team_id

-- Update player_performance policies
DROP POLICY IF EXISTS "Coaches can view their team's performance" ON public.player_performance;
CREATE POLICY "Coaches can view their team's performance" ON public.player_performance
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  has_role(auth.uid(), 'medical'::user_role) OR
  (EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON p.id = pt.player_id
    JOIN teams t ON pt.team_id = t.id
    WHERE p.id = player_performance.player_id
    AND t.coach_id = auth.uid()
    AND pt.is_active = true
  ))
);

-- Update rehabilitation_plans policies
DROP POLICY IF EXISTS "Coaches can view their team's rehabilitation plans" ON public.rehabilitation_plans;
CREATE POLICY "Coaches can view their team's rehabilitation plans" ON public.rehabilitation_plans
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  has_role(auth.uid(), 'medical'::user_role) OR
  (EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON p.id = pt.player_id
    JOIN teams t ON pt.team_id = t.id
    WHERE p.id = rehabilitation_plans.player_id
    AND t.coach_id = auth.uid()
    AND pt.is_active = true
  ))
);

-- Update shotiq_settings policies
DROP POLICY IF EXISTS "Coaches can view their team's ShotIQ settings" ON public.shotiq_settings;
CREATE POLICY "Coaches can view their team's ShotIQ settings" ON public.shotiq_settings
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON p.id = pt.player_id
    JOIN teams t ON pt.team_id = t.id
    WHERE p.id = shotiq_settings.player_id
    AND t.coach_id = auth.uid()
    AND pt.is_active = true
  ))
);

-- Update drill_messages policies
DROP POLICY IF EXISTS "Coaches can manage their team's drill messages" ON public.drill_messages;
CREATE POLICY "Coaches can manage their team's drill messages" ON public.drill_messages
FOR ALL 
USING (
  is_super_admin(auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON p.id = pt.player_id
    JOIN teams t ON pt.team_id = t.id
    WHERE p.id = drill_messages.player_id
    AND t.coach_id = auth.uid()
    AND pt.is_active = true
  ))
);

-- Update teams policies  
DROP POLICY IF EXISTS "Players can view teams" ON public.teams;
CREATE POLICY "Players can view teams" ON public.teams
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  has_role(auth.uid(), 'staff'::user_role) OR
  has_role(auth.uid(), 'coach'::user_role) OR
  (EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON p.id = pt.player_id
    WHERE pt.team_id = teams.id
    AND p.user_id = auth.uid()
    AND pt.is_active = true
  ))
);

-- Update schedules policies
DROP POLICY IF EXISTS "Players can view schedules" ON public.schedules;
CREATE POLICY "Players can view schedules" ON public.schedules
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR
  has_role(auth.uid(), 'staff'::user_role) OR
  has_role(auth.uid(), 'coach'::user_role) OR
  (auth.uid() = ANY(schedules.team_ids::uuid[])) OR
  (EXISTS (
    SELECT 1 FROM players p
    JOIN player_teams pt ON p.id = pt.player_id
    WHERE pt.team_id = ANY(schedules.team_ids)
    AND p.user_id = auth.uid()
    AND pt.is_active = true
  ))
);

-- Update profiles policies (remove the problematic reference)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (id = auth.uid());