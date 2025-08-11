-- Insert sample sponsorship relationships
INSERT INTO partner_team_sponsorships (partner_organization_id, team_id, sponsorship_amount, sponsorship_type, start_date, end_date, status) 
SELECT 
    po.id,
    t.id,
    CASE 
        WHEN po.name = 'SportsTech Solutions' AND t.name IN ('Eagles', 'Hawks') THEN 25000.00
        WHEN po.name = 'Elite Athletics Gear' AND t.name IN ('Lions', 'Bears') THEN 15000.00
        ELSE 10000.00
    END,
    'financial',
    '2024-01-01',
    '2024-12-31',
    'active'
FROM partner_organizations po
CROSS JOIN teams t
WHERE (po.name = 'SportsTech Solutions' AND t.name IN ('Eagles', 'Hawks'))
   OR (po.name = 'Elite Athletics Gear' AND t.name IN ('Lions', 'Bears'))
   OR (po.name = 'Phoenix Media Group' AND t.name = 'Eagles')
   OR (po.name = 'Community Health Center' AND t.name = 'Bears')
ON CONFLICT DO NOTHING;