-- First, let's create some sample injury reports for testing
-- Get some existing player IDs to create realistic data
INSERT INTO injury_reports (
  player_id, 
  reported_by, 
  injury_type, 
  injury_location, 
  injury_description, 
  severity_level, 
  date_occurred, 
  symptoms, 
  status,
  treatment_received
) 
SELECT 
  p.id as player_id,
  p.user_id as reported_by,
  CASE (random() * 4)::int 
    WHEN 0 THEN 'Sprain'
    WHEN 1 THEN 'Strain'  
    WHEN 2 THEN 'Contusion'
    WHEN 3 THEN 'Overuse'
    ELSE 'Other'
  END as injury_type,
  CASE (random() * 7)::int
    WHEN 0 THEN 'Ankle'
    WHEN 1 THEN 'Knee' 
    WHEN 2 THEN 'Shoulder'
    WHEN 3 THEN 'Back'
    WHEN 4 THEN 'Wrist'
    WHEN 5 THEN 'Hip'
    ELSE 'Other'
  END as injury_location,
  'Sample injury report for testing analytics',
  CASE (random() * 3)::int
    WHEN 0 THEN 'mild'
    WHEN 1 THEN 'moderate'
    ELSE 'severe'
  END as severity_level,
  CURRENT_DATE - (random() * 90)::int as date_occurred,
  ARRAY['pain', 'swelling'],
  CASE (random() * 2)::int
    WHEN 0 THEN 'active'
    ELSE 'resolved'
  END as status,
  'Rest and ice treatment'
FROM players p 
LIMIT 15;

-- Create RPC function to get injury breakdown data
CREATE OR REPLACE FUNCTION public.rpc_get_injury_breakdown(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  total_injuries integer;
BEGIN
  -- Only medical staff and super admins can access injury data
  IF NOT (has_role(auth.uid(), 'medical'::user_role) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Only medical staff can view injury data';
  END IF;

  -- Get total count for percentage calculations
  SELECT COUNT(*) INTO total_injuries
  FROM injury_reports ir
  WHERE ir.date_occurred >= CURRENT_DATE - days_back;

  -- Build injury breakdown with real data
  WITH injury_stats AS (
    SELECT 
      ir.injury_location,
      COUNT(*) as injury_count,
      ROUND((COUNT(*) * 100.0 / NULLIF(total_injuries, 0)), 0) as percentage
    FROM injury_reports ir
    WHERE ir.date_occurred >= CURRENT_DATE - days_back
    GROUP BY ir.injury_location
    ORDER BY COUNT(*) DESC
  )
  SELECT jsonb_build_object(
    'breakdown', jsonb_agg(
      jsonb_build_object(
        'type', COALESCE(injury_location || ' Injuries', 'Unknown Injuries'),
        'count', injury_count,
        'percentage', COALESCE(percentage, 0)
      )
    ),
    'total_injuries', total_injuries,
    'active_injuries', (
      SELECT COUNT(*) FROM injury_reports 
      WHERE status IN ('active', 'treating') 
      AND date_occurred >= CURRENT_DATE - days_back
    ),
    'timeframe_days', days_back
  ) INTO result
  FROM injury_stats;

  RETURN COALESCE(result, jsonb_build_object(
    'breakdown', '[]'::jsonb,
    'total_injuries', 0,
    'active_injuries', 0,
    'timeframe_days', days_back
  ));
END;
$$;

-- Create RPC function to get players with specific injury type
CREATE OR REPLACE FUNCTION public.rpc_get_players_with_injury(injury_location_param text, days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only medical staff and super admins can access injury data
  IF NOT (has_role(auth.uid(), 'medical'::user_role) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Only medical staff can view injury data';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'player_id', p.id,
      'player_name', pr.full_name,
      'injury_type', ir.injury_type,
      'severity', ir.severity_level,
      'date_occurred', ir.date_occurred,
      'status', ir.status,
      'team_name', t.name
    )
  ) INTO result
  FROM injury_reports ir
  INNER JOIN players p ON ir.player_id = p.id
  INNER JOIN profiles pr ON p.user_id = pr.id
  LEFT JOIN player_teams pt ON p.id = pt.player_id AND pt.is_active = true
  LEFT JOIN teams t ON pt.team_id = t.id
  WHERE ir.injury_location = injury_location_param
    AND ir.date_occurred >= CURRENT_DATE - days_back
  ORDER BY ir.date_occurred DESC;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;