-- Production Setup Script for 100IN Basketball Management System
-- Run this after initial deployment to set up production data

-- Insert notification types (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notification_types WHERE name = 'user_registration') THEN
    INSERT INTO notification_types (name, description, category, icon) VALUES
    ('user_registration', 'New user registration requiring approval', 'system', 'user-plus'),
    ('system', 'System-wide notifications', 'system', 'settings'),
    ('medical_alert', 'Medical alerts and health notifications', 'medical', 'heart'),
    ('schedule_update', 'Schedule and event updates', 'schedule', 'calendar'),
    ('payment_due', 'Payment and billing notifications', 'finance', 'credit-card'),
    ('team_update', 'Team-related updates and announcements', 'team', 'users');
  END IF;
END $$;

-- Insert permissions for the system
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_users') THEN
    INSERT INTO permissions (name, description, category) VALUES
    ('manage_users', 'Create, edit, and manage user accounts', 'user_management'),
    ('manage_teams', 'Create and manage teams', 'team_management'),
    ('manage_schedules', 'Create and manage schedules and events', 'schedule_management'),
    ('manage_medical', 'Access and manage medical records', 'medical'),
    ('manage_finances', 'Access financial data and payments', 'finance'),
    ('manage_employees', 'Manage employee records and HR data', 'hr'),
    ('view_reports', 'Access analytics and reports', 'analytics'),
    ('manage_evaluations', 'Create and manage player evaluations', 'evaluations'),
    ('manage_news', 'Create and manage news content', 'content');
  END IF;
END $$;

-- Insert role permissions
DO $$
DECLARE
    perm_id UUID;
BEGIN
    -- Super admin gets all permissions
    FOR perm_id IN SELECT id FROM permissions LOOP
        INSERT INTO role_permissions (role, permission_id)
        VALUES ('super_admin', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
    
    -- Staff permissions
    FOR perm_id IN SELECT id FROM permissions WHERE name IN ('manage_users', 'manage_teams', 'manage_schedules', 'view_reports', 'manage_news') LOOP
        INSERT INTO role_permissions (role, permission_id)
        VALUES ('staff', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
    
    -- Coach permissions
    FOR perm_id IN SELECT id FROM permissions WHERE name IN ('manage_teams', 'manage_schedules', 'view_reports', 'manage_evaluations') LOOP
        INSERT INTO role_permissions (role, permission_id)
        VALUES ('coach', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
    
    -- Medical permissions
    FOR perm_id IN SELECT id FROM permissions WHERE name IN ('manage_medical', 'view_reports') LOOP
        INSERT INTO role_permissions (role, permission_id)
        VALUES ('medical', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
    
    -- Partner permissions
    FOR perm_id IN SELECT id FROM permissions WHERE name IN ('view_reports', 'manage_finances') LOOP
        INSERT INTO role_permissions (role, permission_id)
        VALUES ('partner', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
END $$;

-- Insert initial membership types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM membership_types WHERE name = 'Monthly Unlimited') THEN
    INSERT INTO membership_types (name, allocation_type, allocated_classes, is_active) VALUES
    ('Monthly Unlimited', 'unlimited', NULL, true),
    ('10 Class Package', 'count', 10, true),
    ('20 Class Package', 'count', 20, true),
    ('Drop-in Single', 'count', 1, true),
    ('Weekly Training', 'weekly', 4, true);
  END IF;
END $$;

-- Create welcome news post
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM news WHERE title = 'Welcome to 100IN Basketball Management System') THEN
    INSERT INTO news (title, content, is_published, created_by)
    SELECT 
      'Welcome to 100IN Basketball Management System',
      '<p>Welcome to the new 100IN Basketball Management System! This comprehensive platform will help us manage our teams, track player performance, monitor health and wellness, and streamline all basketball operations.</p><p>Key features include:</p><ul><li>Player performance tracking and analytics</li><li>Medical and health monitoring</li><li>Team scheduling and management</li><li>Parent communication tools</li><li>HR and employee management</li><li>Partner and sponsorship management</li></ul><p>For assistance or questions, please contact the system administrator.</p>',
      true,
      (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1);
  END IF;
END $$;

-- Create analytics event for system initialization
INSERT INTO analytics_events (event_type, event_data, user_id)
SELECT 
  'production_setup_completed',
  jsonb_build_object(
    'timestamp', now(),
    'version', '1.0.0',
    'environment', 'production',
    'setup_date', CURRENT_DATE
  ),
  (SELECT id FROM auth.users WHERE email = 'nahtral@supernahtral.com' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM analytics_events 
  WHERE event_type = 'production_setup_completed'
);

-- Summary report
SELECT 
  'Production Setup Complete' AS status,
  (SELECT COUNT(*) FROM notification_types) AS notification_types_count,
  (SELECT COUNT(*) FROM permissions) AS permissions_count,
  (SELECT COUNT(*) FROM role_permissions) AS role_permissions_count,
  (SELECT COUNT(*) FROM membership_types) AS membership_types_count,
  (SELECT COUNT(*) FROM profiles WHERE approval_status = 'approved') AS approved_users_count;