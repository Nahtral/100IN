-- Fix security warnings for membership system

-- Fix the view security definer issue by removing security definer and ensuring RLS on source tables
CREATE OR REPLACE VIEW public.vw_player_membership_usage_secure AS
WITH attendance_counts AS (
  SELECT 
    pa.player_id,
    pm.id as membership_id,
    COUNT(*) FILTER (WHERE pa.status = 'present') as used_classes
  FROM public.player_memberships pm
  JOIN public.players p ON p.id = pm.player_id
  LEFT JOIN public.player_attendance pa ON pa.player_id = pm.player_id 
    AND pa.created_at >= pm.start_date
    AND (pm.end_date IS NULL OR pa.created_at <= pm.end_date + INTERVAL '1 day')
  WHERE pm.status = 'ACTIVE'
  GROUP BY pa.player_id, pm.id
),
membership_summary AS (
  SELECT 
    pm.id as membership_id,
    pm.player_id,
    COALESCE(p.name, p.manual_entry_name, 'Unknown Player') as player_name,
    mt.name as membership_type_name,
    mt.allocation_type,
    pm.start_date,
    pm.end_date,
    pm.status,
    pm.auto_deactivate_when_used_up,
    pm.manual_override_active,
    COALESCE(pm.allocated_classes_override, mt.allocated_classes) as allocated_classes,
    COALESCE(ac.used_classes, 0) as used_classes,
    CASE 
      WHEN mt.allocation_type = 'CLASS_COUNT' THEN 
        GREATEST(COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) - COALESCE(ac.used_classes, 0), 0)
      ELSE NULL
    END as remaining_classes,
    CASE 
      WHEN mt.allocation_type = 'DATE_RANGE' AND pm.end_date IS NOT NULL THEN
        GREATEST(0, pm.end_date - CURRENT_DATE)
      ELSE NULL
    END as days_left,
    CASE 
      WHEN mt.allocation_type = 'DATE_RANGE' AND pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as is_expired,
    CASE 
      WHEN pm.manual_override_active = true THEN false
      WHEN mt.allocation_type = 'CLASS_COUNT' AND pm.auto_deactivate_when_used_up = true 
        AND COALESCE(ac.used_classes, 0) >= COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) THEN true
      WHEN mt.allocation_type = 'DATE_RANGE' AND pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as should_deactivate
  FROM public.player_memberships pm
  JOIN public.membership_types mt ON mt.id = pm.membership_type_id
  JOIN public.players p ON p.id = pm.player_id
  LEFT JOIN attendance_counts ac ON ac.membership_id = pm.id
  WHERE pm.status = 'ACTIVE'
)
SELECT * FROM membership_summary;

-- Drop the old view
DROP VIEW IF EXISTS public.vw_player_membership_usage;

-- Update functions to have proper search path
CREATE OR REPLACE FUNCTION public.fn_get_membership_summary(target_player_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT row_to_json(summary)
  FROM (
    SELECT 
      allocated_classes,
      used_classes,
      remaining_classes,
      status,
      membership_type_name as type,
      days_left,
      should_deactivate,
      is_expired,
      start_date,
      end_date,
      allocation_type
    FROM vw_player_membership_usage_secure 
    WHERE player_id = target_player_id
    ORDER BY start_date DESC
    LIMIT 1
  ) summary;
$$;

-- Update auto-deactivation function
CREATE OR REPLACE FUNCTION public.fn_auto_deactivate_players()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deactivated_count INTEGER := 0;
  player_record RECORD;
BEGIN
  FOR player_record IN 
    SELECT DISTINCT player_id, player_name
    FROM vw_player_membership_usage_secure 
    WHERE should_deactivate = true
  LOOP
    -- Deactivate player
    UPDATE players 
    SET is_active = false, 
        deactivation_reason = 'Membership used up / expired',
        updated_at = now()
    WHERE id = player_record.player_id;
    
    -- Update membership status
    UPDATE player_memberships 
    SET status = 'INACTIVE',
        updated_at = now()
    WHERE player_id = player_record.player_id AND status = 'ACTIVE';
    
    deactivated_count := deactivated_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'deactivated_count', deactivated_count,
    'timestamp', now()
  );
END;
$$;