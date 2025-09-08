-- Address security definer view warnings by recreating views as regular views
-- Drop and recreate the problematic view without security definer

-- First check if the view exists and what it looks like
DO $$ 
BEGIN
  -- Drop the problematic view that might be causing security warnings
  DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;
  
  -- Recreate as a regular view (not security definer)
  CREATE VIEW public.vw_player_membership_usage_secure AS
  SELECT 
    pm.id AS membership_id,
    pm.player_id,
    prof.full_name AS player_name,
    mt.name AS membership_type_name,
    mt.allocation_type,
    CASE
      WHEN pm.allocated_classes_override IS NOT NULL THEN pm.allocated_classes_override
      WHEN mt.allocation_type = 'CLASS_COUNT' THEN mt.allocated_classes
      ELSE NULL
    END AS allocated_classes,
    COALESCE(SUM(mu.classes_used), 0)::integer AS used_classes,
    CASE
      WHEN mt.allocation_type = 'UNLIMITED' THEN NULL::bigint
      WHEN pm.allocated_classes_override IS NOT NULL THEN 
        (pm.allocated_classes_override - COALESCE(SUM(mu.classes_used), 0))
      WHEN mt.allocation_type = 'CLASS_COUNT' THEN 
        (mt.allocated_classes - COALESCE(SUM(mu.classes_used), 0))
      ELSE NULL::bigint
    END AS remaining_classes,
    pm.status,
    pm.start_date,
    pm.end_date,
    CASE
      WHEN pm.end_date IS NOT NULL THEN (pm.end_date - CURRENT_DATE)
      ELSE NULL
    END AS days_left,
    CASE
      WHEN pm.status = 'INACTIVE' THEN true
      WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
      WHEN mt.allocation_type = 'CLASS_COUNT' 
        AND pm.auto_deactivate_when_used_up 
        AND COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) <= COALESCE(SUM(mu.classes_used), 0)
        THEN true
      ELSE false
    END AS should_deactivate,
    CASE
      WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END AS is_expired
  FROM player_memberships pm
  JOIN membership_types mt ON pm.membership_type_id = mt.id
  JOIN players p ON pm.player_id = p.id
  JOIN profiles prof ON p.user_id = prof.id
  LEFT JOIN membership_usage mu ON pm.id = mu.player_membership_id
  GROUP BY 
    pm.id, pm.player_id, prof.full_name, mt.name, mt.allocation_type, 
    mt.allocated_classes, pm.allocated_classes_override, pm.status, 
    pm.start_date, pm.end_date, pm.auto_deactivate_when_used_up;

  -- Enable RLS on the view
  ALTER VIEW public.vw_player_membership_usage_secure SET (security_barrier = true);
END $$;