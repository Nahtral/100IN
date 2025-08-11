-- First, let's check and fix the teams table structure
ALTER TABLE teams ADD COLUMN IF NOT EXISTS division TEXT;

-- Insert sample partner organizations
INSERT INTO partner_organizations (name, description, partnership_type, partnership_status, contact_person, contact_email, contact_phone, partnership_value, contract_start_date, contract_end_date, created_by) VALUES
('SportsTech Solutions', 'Leading sports technology and analytics provider', 'sponsor', 'active', 'John Smith', 'john@sportstech.com', '+1-555-0123', 75000.00, '2024-01-01', '2024-12-31', (SELECT id FROM auth.users LIMIT 1)),
('Elite Athletics Gear', 'Premium basketball equipment and apparel', 'equipment', 'active', 'Sarah Johnson', 'sarah@elitegear.com', '+1-555-0456', 50000.00, '2024-03-01', '2025-02-28', (SELECT id FROM auth.users LIMIT 1)),
('Phoenix Media Group', 'Sports broadcasting and media services', 'media', 'active', 'Mike Davis', 'mike@phoenixmedia.com', '+1-555-0789', 35000.00, '2024-06-01', '2025-05-31', (SELECT id FROM auth.users LIMIT 1)),
('Community Health Center', 'Medical and wellness services', 'medical', 'active', 'Dr. Lisa Chen', 'lisa@communityhc.org', '+1-555-0321', 25000.00, '2024-02-15', '2025-02-14', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert sample teams (with conflict handling in case they exist)
INSERT INTO teams (name, age_group, division) VALUES
('Eagles', 'U18', 'Division A'),
('Hawks', 'U16', 'Division A'),
('Lions', 'U14', 'Division B'),
('Bears', 'U12', 'Division C'),
('Tigers', 'U18', 'Division B'),
('Wolves', 'U16', 'Division B')
ON CONFLICT (name) DO NOTHING;

-- Create partner_team_sponsorships table
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