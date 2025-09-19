-- Drop dependent views first, then fix the column issue
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;

-- Fix the remaining_classes column duplication issue
ALTER TABLE public.player_memberships 
DROP COLUMN IF EXISTS remaining_classes CASCADE;

-- Update existing data for new schema
UPDATE public.player_memberships 
SET class_quota = COALESCE(classes_total, 10),
    classes_used = COALESCE(classes_used, 0)
WHERE class_quota IS NULL;

-- Set status based on current state
UPDATE public.player_memberships 
SET status = CASE 
  WHEN COALESCE(classes_used, 0) >= COALESCE(class_quota, classes_total, 10) THEN 'depleted'::membership_status
  WHEN end_date IS NOT NULL AND end_date < CURRENT_DATE THEN 'expired'::membership_status
  ELSE 'active'::membership_status
END
WHERE status IS NULL;

-- Recreate the backward compatibility view
CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  pm.id AS membership_id,
  pm.player_id,
  pm.class_quota AS allocated_classes,
  pm.classes_used AS used_classes,
  GREATEST(COALESCE(pm.class_quota, 0) - pm.classes_used, 0) AS remaining_classes,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN EXTRACT(days FROM pm.end_date - CURRENT_DATE)::integer
    ELSE NULL
  END AS days_left,
  CASE 
    WHEN pm.status = 'depleted' OR (pm.class_quota IS NOT NULL AND pm.classes_used >= pm.class_quota) THEN true
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END AS should_deactivate,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END AS is_expired,
  pm.start_date,
  pm.end_date,
  p.full_name AS player_name,
  pm.status,
  mt.name AS membership_type_name,
  mt.kind AS allocation_type
FROM public.player_memberships pm
JOIN public.players pl ON pl.id = pm.player_id
JOIN public.profiles p ON p.id = pl.user_id
JOIN public.membership_types mt ON mt.id = pm.membership_type_id;