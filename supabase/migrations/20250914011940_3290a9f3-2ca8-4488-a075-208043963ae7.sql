-- Enable RLS on all new tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "team_members_read_all" ON public.team_members
FOR SELECT USING (true);

CREATE POLICY "team_members_admin_write" ON public.team_members
FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

CREATE POLICY "team_members_admin_update" ON public.team_members
FOR UPDATE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

-- RLS Policies for attendance
CREATE POLICY "att_read_admins" ON public.attendance
FOR SELECT USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role));

CREATE POLICY "att_write_admins" ON public.attendance
FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role));

CREATE POLICY "att_update_admins" ON public.attendance
FOR UPDATE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role));

CREATE POLICY "att_read_self" ON public.attendance
FOR SELECT USING (player_id = auth.uid());

-- RLS Policies for player_memberships
CREATE POLICY "pm_read_self" ON public.player_memberships
FOR SELECT USING (player_id = auth.uid() OR is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

CREATE POLICY "pm_admin_write" ON public.player_memberships
FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

CREATE POLICY "pm_admin_update" ON public.player_memberships
FOR UPDATE USING (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role))
WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

-- RLS Policies for membership_ledger
CREATE POLICY "ledger_read_self" ON public.membership_ledger
FOR SELECT USING (player_id = auth.uid() OR is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role));

CREATE POLICY "ledger_admin_write" ON public.membership_ledger
FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR has_role(auth.uid(),'staff'::user_role) OR has_role(auth.uid(),'coach'::user_role));