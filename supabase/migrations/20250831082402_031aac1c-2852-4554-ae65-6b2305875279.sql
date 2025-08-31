-- Create parent-child relationships table
CREATE TABLE IF NOT EXISTS public.parent_child_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  child_id UUID NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'parent',
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Enable RLS
ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for parent-child relationships
CREATE POLICY "Super admins can manage all relationships" 
ON public.parent_child_relationships 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Parents can view their own relationships" 
ON public.parent_child_relationships 
FOR SELECT 
USING (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE POLICY "Parents can request relationships" 
ON public.parent_child_relationships 
FOR INSERT 
WITH CHECK (auth.uid() = parent_id);

-- Create coach assignments table
CREATE TABLE IF NOT EXISTS public.coach_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  team_id UUID,
  player_id UUID,
  assignment_type TEXT NOT NULL DEFAULT 'team',
  status TEXT NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (
    (assignment_type = 'team' AND team_id IS NOT NULL AND player_id IS NULL) OR
    (assignment_type = 'player' AND player_id IS NOT NULL AND team_id IS NULL)
  )
);

-- Enable RLS
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for coach assignments
CREATE POLICY "Super admins can manage all coach assignments" 
ON public.coach_assignments 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Coaches can view their assignments" 
ON public.coach_assignments 
FOR SELECT 
USING (auth.uid() = coach_id OR has_role(auth.uid(), 'staff'::user_role));

-- Create staff management table (extending employees)
CREATE TABLE IF NOT EXISTS public.staff_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID,
  budget_allocation NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staff departments
CREATE POLICY "Super admins can manage all departments" 
ON public.staff_departments 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view department info" 
ON public.staff_departments 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

-- Create permission categories table
CREATE TABLE IF NOT EXISTS public.permission_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for permission categories
CREATE POLICY "Super admins can manage permission categories" 
ON public.permission_categories 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Insert default permission categories
INSERT INTO public.permission_categories (name, description, sort_order) VALUES
('User Management', 'Permissions related to user account management', 1),
('Team Management', 'Permissions for managing teams and players', 2),
('Medical Access', 'Permissions for accessing medical data', 3),
('Financial Management', 'Permissions for financial operations', 4),
('System Administration', 'High-level system administration permissions', 5),
('Content Management', 'Permissions for managing news and content', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
('manage_users', 'Create, edit, and manage user accounts', 'User Management'),
('approve_registrations', 'Approve new user registrations', 'User Management'),
('manage_teams', 'Create and manage teams', 'Team Management'),
('manage_players', 'Add and manage players', 'Team Management'),
('view_medical_data', 'Access player medical information', 'Medical Access'),
('manage_medical_data', 'Edit and manage medical records', 'Medical Access'),
('manage_finances', 'Handle payments and financial operations', 'Financial Management'),
('view_analytics', 'Access system analytics and reports', 'System Administration'),
('manage_permissions', 'Assign and revoke user permissions', 'System Administration'),
('manage_news', 'Create and publish news updates', 'Content Management'),
('manage_employees', 'Manage employee records and HR functions', 'User Management')
ON CONFLICT (name) DO NOTHING;

-- Create function to get coaches with team assignments
CREATE OR REPLACE FUNCTION public.get_coaches_with_assignments()
RETURNS TABLE(
  coach_id UUID,
  coach_name TEXT,
  coach_email TEXT,
  team_assignments JSONB,
  player_assignments JSONB,
  total_assignments INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as coach_id,
    p.full_name as coach_name,
    p.email as coach_email,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'team_id', t.id,
          'team_name', t.name,
          'assigned_at', ca_team.assigned_at
        )
      ) FILTER (WHERE ca_team.assignment_type = 'team' AND ca_team.status = 'active'),
      '[]'::jsonb
    ) as team_assignments,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'player_id', pl.id,
          'player_name', pl_p.full_name,
          'assigned_at', ca_player.assigned_at
        )
      ) FILTER (WHERE ca_player.assignment_type = 'player' AND ca_player.status = 'active'),
      '[]'::jsonb
    ) as player_assignments,
    COUNT(DISTINCT ca_team.id) + COUNT(DISTINCT ca_player.id) as total_assignments
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN public.coach_assignments ca_team ON p.id = ca_team.coach_id AND ca_team.assignment_type = 'team' AND ca_team.status = 'active'
  LEFT JOIN public.teams t ON ca_team.team_id = t.id
  LEFT JOIN public.coach_assignments ca_player ON p.id = ca_player.coach_id AND ca_player.assignment_type = 'player' AND ca_player.status = 'active'
  LEFT JOIN public.players pl ON ca_player.player_id = pl.id
  LEFT JOIN public.profiles pl_p ON pl.user_id = pl_p.id
  WHERE ur.role = 'coach' AND ur.is_active = true
  GROUP BY p.id, p.full_name, p.email;
$$;

-- Create function to get parent-child relationship requests
CREATE OR REPLACE FUNCTION public.get_parent_child_requests()
RETURNS TABLE(
  request_id UUID,
  parent_name TEXT,
  parent_email TEXT,
  child_name TEXT,
  child_email TEXT,
  relationship_type TEXT,
  status TEXT,
  requested_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pcr.id as request_id,
    p_parent.full_name as parent_name,
    p_parent.email as parent_email,
    p_child.full_name as child_name,
    p_child.email as child_email,
    pcr.relationship_type,
    pcr.status,
    pcr.requested_at
  FROM public.parent_child_relationships pcr
  JOIN public.profiles p_parent ON pcr.parent_id = p_parent.id
  JOIN public.profiles p_child ON pcr.child_id = p_child.id
  ORDER BY pcr.requested_at DESC;
$$;