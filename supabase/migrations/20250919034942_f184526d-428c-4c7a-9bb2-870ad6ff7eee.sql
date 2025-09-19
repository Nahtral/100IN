-- Fix the remaining_classes column duplication issue
-- Drop existing problematic columns first
ALTER TABLE public.player_memberships 
DROP COLUMN IF EXISTS remaining_classes;

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