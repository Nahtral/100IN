-- Create parent-child relationships table if not exists
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

-- Create coach assignments table if not exists
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

-- Create staff departments table if not exists
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

-- Insert default permissions if they don't exist
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