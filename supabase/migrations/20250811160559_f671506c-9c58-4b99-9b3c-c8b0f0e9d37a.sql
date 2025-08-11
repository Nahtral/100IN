-- Insert sample partner organizations
INSERT INTO partner_organizations (name, description, partnership_type, partnership_status, contact_person, contact_email, contact_phone, partnership_value, contract_start_date, contract_end_date, created_by) VALUES
('SportsTech Solutions', 'Leading sports technology and analytics provider', 'sponsor', 'active', 'John Smith', 'john@sportstech.com', '+1-555-0123', 75000.00, '2024-01-01', '2024-12-31', (SELECT id FROM auth.users LIMIT 1)),
('Elite Athletics Gear', 'Premium basketball equipment and apparel', 'equipment', 'active', 'Sarah Johnson', 'sarah@elitegear.com', '+1-555-0456', 50000.00, '2024-03-01', '2025-02-28', (SELECT id FROM auth.users LIMIT 1)),
('Phoenix Media Group', 'Sports broadcasting and media services', 'media', 'active', 'Mike Davis', 'mike@phoenixmedia.com', '+1-555-0789', 35000.00, '2024-06-01', '2025-05-31', (SELECT id FROM auth.users LIMIT 1)),
('Community Health Center', 'Medical and wellness services', 'medical', 'active', 'Dr. Lisa Chen', 'lisa@communityhc.org', '+1-555-0321', 25000.00, '2024-02-15', '2025-02-14', (SELECT id FROM auth.users LIMIT 1));

-- Insert teams table if it doesn't exist (needed for partner relationships)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age_group TEXT,
    division TEXT,
    coach_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policy for teams
CREATE POLICY "All users can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Staff and super admins can manage teams" ON teams FOR ALL USING (has_role(auth.uid(), 'staff') OR is_super_admin(auth.uid()));

-- Insert sample teams
INSERT INTO teams (name, age_group, division) VALUES
('Eagles', 'U18', 'Division A'),
('Hawks', 'U16', 'Division A'),
('Lions', 'U14', 'Division B'),
('Bears', 'U12', 'Division C'),
('Tigers', 'U18', 'Division B'),
('Wolves', 'U16', 'Division B');

-- Create partner_team_sponsorships table to track which partners sponsor which teams
CREATE TABLE IF NOT EXISTS partner_team_sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_organization_id UUID REFERENCES partner_organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    sponsorship_amount DECIMAL(10,2),
    sponsorship_type TEXT NOT NULL DEFAULT 'financial',
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_organization_id, team_id)
);

-- Enable RLS on partner_team_sponsorships
ALTER TABLE partner_team_sponsorships ENABLE ROW LEVEL SECURITY;

-- Create policies for partner_team_sponsorships
CREATE POLICY "Partners can view their own sponsorships" ON partner_team_sponsorships FOR SELECT USING (
    has_role(auth.uid(), 'partner') OR is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can manage all sponsorships" ON partner_team_sponsorships FOR ALL USING (
    is_super_admin(auth.uid())
);

-- Insert sample sponsorship relationships
INSERT INTO partner_team_sponsorships (partner_organization_id, team_id, sponsorship_amount, sponsorship_type, start_date, end_date, status) 
SELECT 
    po.id,
    t.id,
    CASE 
        WHEN po.name = 'SportsTech Solutions' AND t.name IN ('Eagles', 'Hawks') THEN 25000.00
        WHEN po.name = 'Elite Athletics Gear' AND t.name IN ('Lions', 'Bears') THEN 15000.00
        WHEN po.name = 'Phoenix Media Group' AND t.name IN ('Tigers', 'Wolves') THEN 12000.00
        ELSE 8000.00
    END,
    'financial',
    '2024-01-01',
    '2024-12-31',
    'active'
FROM partner_organizations po
CROSS JOIN teams t
WHERE (po.name = 'SportsTech Solutions' AND t.name IN ('Eagles', 'Hawks'))
   OR (po.name = 'Elite Athletics Gear' AND t.name IN ('Lions', 'Bears'))
   OR (po.name = 'Phoenix Media Group' AND t.name IN ('Tigers', 'Wolves'))
   OR (po.name = 'Community Health Center' AND t.name IN ('Bears', 'Tigers'));