-- Insert sample data with proper season values
INSERT INTO teams (name, age_group, division, season) 
SELECT 'Eagles', 'U18', 'Division A', '2024-25'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Eagles');

INSERT INTO teams (name, age_group, division, season) 
SELECT 'Hawks', 'U16', 'Division A', '2024-25'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Hawks');

INSERT INTO teams (name, age_group, division, season) 
SELECT 'Lions', 'U14', 'Division B', '2024-25'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Lions');

INSERT INTO teams (name, age_group, division, season) 
SELECT 'Bears', 'U12', 'Division C', '2024-25'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Bears');

INSERT INTO teams (name, age_group, division, season) 
SELECT 'Tigers', 'U18', 'Division B', '2024-25'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Tigers');

INSERT INTO teams (name, age_group, division, season) 
SELECT 'Wolves', 'U16', 'Division B', '2024-25'
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Wolves');

-- Insert sample partner organizations
INSERT INTO partner_organizations (name, description, partnership_type, partnership_status, contact_person, contact_email, contact_phone, partnership_value, contract_start_date, contract_end_date, created_by) 
SELECT 'SportsTech Solutions', 'Leading sports technology and analytics provider', 'sponsor', 'active', 'John Smith', 'john@sportstech.com', '+1-555-0123', 75000.00, '2024-01-01', '2024-12-31', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM partner_organizations WHERE name = 'SportsTech Solutions');

INSERT INTO partner_organizations (name, description, partnership_type, partnership_status, contact_person, contact_email, contact_phone, partnership_value, contract_start_date, contract_end_date, created_by) 
SELECT 'Elite Athletics Gear', 'Premium basketball equipment and apparel', 'equipment', 'active', 'Sarah Johnson', 'sarah@elitegear.com', '+1-555-0456', 50000.00, '2024-03-01', '2025-02-28', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM partner_organizations WHERE name = 'Elite Athletics Gear');

INSERT INTO partner_organizations (name, description, partnership_type, partnership_status, contact_person, contact_email, contact_phone, partnership_value, contract_start_date, contract_end_date, created_by) 
SELECT 'Phoenix Media Group', 'Sports broadcasting and media services', 'media', 'active', 'Mike Davis', 'mike@phoenixmedia.com', '+1-555-0789', 35000.00, '2024-06-01', '2025-05-31', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM partner_organizations WHERE name = 'Phoenix Media Group');

INSERT INTO partner_organizations (name, description, partnership_type, partnership_status, contact_person, contact_email, contact_phone, partnership_value, contract_start_date, contract_end_date, created_by) 
SELECT 'Community Health Center', 'Medical and wellness services', 'medical', 'active', 'Dr. Lisa Chen', 'lisa@communityhc.org', '+1-555-0321', 25000.00, '2024-02-15', '2025-02-14', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM partner_organizations WHERE name = 'Community Health Center');