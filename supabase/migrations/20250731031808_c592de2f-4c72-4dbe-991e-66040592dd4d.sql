-- Create permissions table
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role_permissions table for default role permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Create user_permissions table for additional user-specific permissions
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  UNIQUE(user_id, permission_id)
);

-- Create role_templates table
CREATE TABLE public.role_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  role user_role NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template_permissions junction table
CREATE TABLE public.template_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(template_id, permission_id)
);

-- Create user_approval_requests table
CREATE TABLE public.user_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_role user_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  reason TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions
CREATE POLICY "Super admins can manage all permissions"
ON public.permissions FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view permissions"
ON public.permissions FOR SELECT
USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Super admins can manage role permissions"
ON public.role_permissions FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view role permissions"
ON public.role_permissions FOR SELECT
USING (true);

-- RLS Policies for user_permissions
CREATE POLICY "Super admins can manage user permissions"
ON public.user_permissions FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for role_templates
CREATE POLICY "Super admins can manage role templates"
ON public.role_templates FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view role templates"
ON public.role_templates FOR SELECT
USING (true);

-- RLS Policies for template_permissions
CREATE POLICY "Super admins can manage template permissions"
ON public.template_permissions FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view template permissions"
ON public.template_permissions FOR SELECT
USING (true);

-- RLS Policies for user_approval_requests
CREATE POLICY "Super admins can manage approval requests"
ON public.user_approval_requests FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own approval requests"
ON public.user_approval_requests FOR SELECT
USING (auth.uid() = user_id);

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
-- User Management
('manage_users', 'Create, edit, and delete user accounts', 'user_management'),
('approve_users', 'Approve new user registration requests', 'user_management'),
('assign_coaches', 'Assign coaches to teams and players', 'user_management'),
('manage_coaches', 'Manage coach accounts and permissions', 'user_management'),
('manage_parents', 'Manage parent accounts and child relationships', 'user_management'),
('change_user_roles', 'Modify user roles and permissions', 'user_management'),
('grant_permissions', 'Grant additional permissions to users', 'user_management'),

-- Team Management
('add_players', 'Add new players to teams', 'team_management'),
('manage_teams', 'Create, edit, and manage teams', 'team_management'),
('manage_stats', 'View and edit player statistics', 'team_management'),
('manage_attendance', 'Track and manage player attendance', 'team_management'),

-- Training & Development
('manage_training', 'Create and manage training programs', 'training'),
('view_reports', 'Access various system reports', 'reporting'),

-- System Administration
('system_admin', 'Full system administration access', 'system');

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'staff', id FROM public.permissions 
WHERE name IN ('manage_users', 'add_players', 'manage_teams', 'manage_stats', 'manage_attendance', 'manage_training', 'view_reports');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'coach', id FROM public.permissions 
WHERE name IN ('manage_attendance', 'view_reports');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'medical', id FROM public.permissions 
WHERE name IN ('view_reports');

-- Create role templates
INSERT INTO public.role_templates (name, description, role, is_default, created_by)
VALUES 
('Administrator', 'Full system access with user management capabilities', 'staff', true, (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1)),
('Coach', 'Basic coaching access - additional permissions granted by super admin', 'coach', true, (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1));

-- Link template permissions
INSERT INTO public.template_permissions (template_id, permission_id)
SELECT rt.id, p.id 
FROM public.role_templates rt
CROSS JOIN public.permissions p
WHERE rt.name = 'Administrator' 
AND p.name IN ('manage_users', 'manage_teams', 'manage_training', 'manage_attendance', 'manage_stats', 'view_reports');

INSERT INTO public.template_permissions (template_id, permission_id)
SELECT rt.id, p.id 
FROM public.role_templates rt
CROSS JOIN public.permissions p
WHERE rt.name = 'Coach' 
AND p.name IN ('manage_attendance');

-- Create functions for permission checking
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Check if user has permission through role
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id 
      AND ur.is_active = TRUE
      AND p.name = _permission_name
  )
  OR
  -- Check if user has additional permission directly
  EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id 
      AND up.is_active = TRUE
      AND p.name = _permission_name
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT, source TEXT)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Get permissions from role
  SELECT p.name, p.description, 'role: ' || ur.role::text
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = _user_id AND ur.is_active = TRUE
  
  UNION
  
  -- Get additional permissions
  SELECT p.name, p.description, 'additional'
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = _user_id AND up.is_active = TRUE;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_role_templates_updated_at
BEFORE UPDATE ON public.role_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_user_approval_requests_status ON public.user_approval_requests(status);
CREATE INDEX idx_permissions_category ON public.permissions(category);