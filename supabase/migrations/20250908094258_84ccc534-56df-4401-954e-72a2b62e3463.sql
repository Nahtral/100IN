-- Update RLS policies for strict player role access control

-- Players table RLS - players can only see their own data and team members
DROP POLICY IF EXISTS "Players can view own and team data" ON public.players;
CREATE POLICY "Players can view own and team data" ON public.players
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  has_role(auth.uid(), 'medical'::user_role) OR
  user_id = auth.uid() OR
  -- Players can see other players only if they're on the same team
  (has_role(auth.uid(), 'player'::user_role) AND 
   EXISTS (
     SELECT 1 FROM public.players p1, public.players p2 
     WHERE p1.user_id = auth.uid() 
       AND p2.id = players.id 
       AND p1.team_id = p2.team_id 
       AND p1.team_id IS NOT NULL
       AND p1.is_active = true 
       AND p2.is_active = true
   ))
);

-- Players cannot insert, update, or delete
DROP POLICY IF EXISTS "Super admins can manage all players" ON public.players;
CREATE POLICY "Super admins can manage all players" ON public.players
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage players" ON public.players;
CREATE POLICY "Staff can manage players" ON public.players
FOR ALL 
USING (has_role(auth.uid(), 'staff'::user_role))
WITH CHECK (has_role(auth.uid(), 'staff'::user_role));

-- Teams table RLS - players can only see teams they belong to
DROP POLICY IF EXISTS "Players can view teams" ON public.teams;
CREATE POLICY "Players can view teams" ON public.teams
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR
  -- Players can only see their own teams
  (has_role(auth.uid(), 'player'::user_role) AND 
   EXISTS (
     SELECT 1 FROM public.players p 
     WHERE p.user_id = auth.uid() 
       AND p.team_id = teams.id 
       AND p.is_active = true
   ))
);

-- Teams management restricted to super admins and staff only
DROP POLICY IF EXISTS "Super admins can manage teams" ON public.teams;
CREATE POLICY "Super admins can manage teams" ON public.teams
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage teams" ON public.teams;
CREATE POLICY "Staff can manage teams" ON public.teams
FOR ALL 
USING (has_role(auth.uid(), 'staff'::user_role))
WITH CHECK (has_role(auth.uid(), 'staff'::user_role));

-- Schedule table RLS - players can only see events for their teams
DROP POLICY IF EXISTS "Players can view schedules" ON public.schedules;
CREATE POLICY "Players can view schedules" ON public.schedules
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR
  -- Players can only see events for their teams or events with no team restrictions
  (has_role(auth.uid(), 'player'::user_role) AND 
   (team_ids IS NULL OR team_ids = '{}' OR 
    EXISTS (
      SELECT 1 FROM public.players p 
      WHERE p.user_id = auth.uid() 
        AND p.team_id = ANY(team_ids) 
        AND p.is_active = true
    )))
);

-- Schedule management restricted to super admins and staff only
DROP POLICY IF EXISTS "Super admins can manage schedules" ON public.schedules;
CREATE POLICY "Super admins can manage schedules" ON public.schedules
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage schedules" ON public.schedules;
CREATE POLICY "Staff can manage schedules" ON public.schedules
FOR ALL 
USING (has_role(auth.uid(), 'staff'::user_role))
WITH CHECK (has_role(auth.uid(), 'staff'::user_role));

-- Profiles table - players can only see their own profile data
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'medical'::user_role) OR
  id = auth.uid() OR
  -- Players can see other players' basic info only if on same team
  (has_role(auth.uid(), 'player'::user_role) AND 
   EXISTS (
     SELECT 1 FROM public.players p1, public.players p2 
     WHERE p1.user_id = auth.uid() 
       AND p2.user_id = profiles.id 
       AND p1.team_id = p2.team_id 
       AND p1.team_id IS NOT NULL
       AND p1.is_active = true 
       AND p2.is_active = true
   ))
);

-- User roles - players cannot view other users' roles
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
CREATE POLICY "Users can view roles" ON public.user_roles
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR
  user_id = auth.uid()
);

-- Analytics events - players cannot access analytics
DROP POLICY IF EXISTS "Players cannot access analytics" ON public.analytics_events;
CREATE POLICY "Players cannot access analytics" ON public.analytics_events
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'staff'::user_role) OR
  has_role(auth.uid(), 'coach'::user_role) OR
  has_role(auth.uid(), 'medical'::user_role) OR
  has_role(auth.uid(), 'partner'::user_role)
);

-- Ensure players cannot insert/update/delete most tables
CREATE POLICY "Players read only access" ON public.analytics_events
FOR INSERT 
WITH CHECK (NOT has_role(auth.uid(), 'player'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Players read only schedules" ON public.schedules
FOR INSERT 
WITH CHECK (NOT has_role(auth.uid(), 'player'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Players read only teams" ON public.teams
FOR INSERT 
WITH CHECK (NOT has_role(auth.uid(), 'player'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Players read only players" ON public.players
FOR INSERT 
WITH CHECK (NOT has_role(auth.uid(), 'player'::user_role) OR is_super_admin(auth.uid()));