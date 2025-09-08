-- Insert sample staff departments with proper created_by
INSERT INTO staff_departments (name, description, manager_id, budget_allocation, created_by) VALUES
('Basketball Operations', 'Manages all basketball-related activities, training programs, and player development', NULL, 150000.00, (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1)),
('Medical & Wellness', 'Oversees player health, injury prevention, and medical clearances', NULL, 75000.00, (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1)),
('Coaching & Development', 'Responsible for coaching staff coordination and skill development programs', NULL, 120000.00, (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1)),
('Administrative Services', 'Handles registration, scheduling, and general administrative tasks', NULL, 50000.00, (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1)),
('Partnership & Community', 'Manages partnerships, sponsorships, and community outreach programs', NULL, 80000.00, (SELECT id FROM profiles WHERE approval_status = 'approved' LIMIT 1))
ON CONFLICT (name) DO NOTHING;