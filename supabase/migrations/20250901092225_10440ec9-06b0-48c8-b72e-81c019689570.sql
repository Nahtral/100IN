-- Create initial production data for 100IN system (Fixed)
-- Insert notification types
INSERT INTO notification_types (name, description, category, icon) VALUES
('user_registration', 'New user registration requiring approval', 'system', 'user-plus'),
('system', 'System-wide notifications', 'system', 'settings'),
('medical_alert', 'Medical alerts and health notifications', 'medical', 'heart'),
('schedule_update', 'Schedule and event updates', 'schedule', 'calendar'),
('payment_due', 'Payment and billing notifications', 'finance', 'credit-card'),
('team_update', 'Team-related updates and announcements', 'team', 'users')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions for the system
INSERT INTO permissions (name, description, category) VALUES
('manage_users', 'Create, edit, and manage user accounts', 'user_management'),
('manage_teams', 'Create and manage teams', 'team_management'),
('manage_schedules', 'Create and manage schedules and events', 'schedule_management'),
('manage_medical', 'Access and manage medical records', 'medical'),
('manage_finances', 'Access financial data and payments', 'finance'),
('manage_employees', 'Manage employee records and HR data', 'hr'),
('view_reports', 'Access analytics and reports', 'analytics'),
('manage_evaluations', 'Create and manage player evaluations', 'evaluations'),
('manage_news', 'Create and manage news content', 'content')
ON CONFLICT (name) DO NOTHING;

-- Insert role permissions for super_admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert role permissions for staff
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions 
WHERE name IN ('manage_users', 'manage_teams', 'manage_schedules', 'view_reports', 'manage_news')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert role permissions for coach
INSERT INTO role_permissions (role, permission_id)
SELECT 'coach', id FROM permissions 
WHERE name IN ('manage_teams', 'manage_schedules', 'view_reports', 'manage_evaluations')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert role permissions for medical
INSERT INTO role_permissions (role, permission_id)
SELECT 'medical', id FROM permissions 
WHERE name IN ('manage_medical', 'view_reports')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert role permissions for partner
INSERT INTO role_permissions (role, permission_id)
SELECT 'partner', id FROM permissions 
WHERE name IN ('view_reports', 'manage_finances')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Create initial super admin user (nahtral@supernahtral.com)
-- First insert into profiles (if not exists)
INSERT INTO profiles (id, email, full_name, approval_status)
SELECT 
  auth.users.id,
  'nahtral@supernahtral.com',
  'System Administrator',
  'approved'
FROM auth.users 
WHERE email = 'nahtral@supernahtral.com'
ON CONFLICT (id) DO UPDATE SET
  approval_status = 'approved';

-- Assign super_admin role to the admin user
INSERT INTO user_roles (user_id, role, is_active)
SELECT 
  auth.users.id,
  'super_admin',
  true
FROM auth.users 
WHERE email = 'nahtral@supernahtral.com'
ON CONFLICT (user_id, role) DO UPDATE SET
  is_active = true;

-- Insert initial membership types
INSERT INTO membership_types (name, allocation_type, allocated_classes, is_active) VALUES
('Monthly Unlimited', 'unlimited', NULL, true),
('10 Class Package', 'count', 10, true),
('20 Class Package', 'count', 20, true),
('Drop-in Single', 'count', 1, true),
('Weekly Training', 'weekly', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Create a default team for initial setup
INSERT INTO teams (name, description, team_type, age_group, skill_level, is_active, created_by)
SELECT 
  'Panthers Elite',
  'Premier competitive basketball team',
  'competitive',
  '16-18',
  'elite',
  true,
  auth.users.id
FROM auth.users 
WHERE email = 'nahtral@supernahtral.com'
ON CONFLICT (name) DO NOTHING;

-- Create analytics event for system initialization
INSERT INTO analytics_events (event_type, event_data, user_id)
SELECT 
  'system_initialization',
  jsonb_build_object(
    'timestamp', now(),
    'version', '1.0.0',
    'environment', 'production',
    'admin_email', 'nahtral@supernahtral.com'
  ),
  auth.users.id
FROM auth.users 
WHERE email = 'nahtral@supernahtral.com';

-- Create initial news post
INSERT INTO news (title, content, is_published, created_by)
SELECT 
  'Welcome to 100IN Basketball Management System',
  '<p>Welcome to the new 100IN Basketball Management System! This comprehensive platform will help us manage our teams, track player performance, monitor health and wellness, and streamline all basketball operations.</p><p>Key features include:</p><ul><li>Player performance tracking and analytics</li><li>Medical and health monitoring</li><li>Team scheduling and management</li><li>Parent communication tools</li><li>HR and employee management</li><li>Partner and sponsorship management</li></ul><p>For assistance or questions, please contact the system administrator.</p>',
  true,
  auth.users.id
FROM auth.users 
WHERE email = 'nahtral@supernahtral.com';