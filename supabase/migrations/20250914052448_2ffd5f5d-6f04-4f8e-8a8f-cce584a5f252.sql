-- Fix security definer views by removing SECURITY DEFINER property
-- These views should use invoker rights (default) for proper RLS enforcement

-- Fix v_player_membership_usage view
DROP VIEW IF EXISTS public.v_player_membership_usage;
CREATE VIEW public.v_player_membership_usage AS
  SELECT 
    pm.id as membership_id,
    pm.player_id,
    p.full_name as player_name,
    mt.name as membership_type_name,
    pm.allocated_classes,
    pm.used_classes,
    (pm.allocated_classes - pm.used_classes) as remaining_classes,
    pm.status,
    CASE 
      WHEN pm.end_date < CURRENT_DATE THEN extract(days from CURRENT_DATE - pm.end_date)
      ELSE extract(days from pm.end_date - CURRENT_DATE)
    END as days_left,
    CASE 
      WHEN (pm.allocated_classes - pm.used_classes) <= 0 OR pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as should_deactivate,
    CASE 
      WHEN pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as is_expired,
    pm.start_date,
    pm.end_date,
    mt.allocation_type
  FROM player_memberships pm
  JOIN membership_types mt ON pm.membership_type_id = mt.id
  LEFT JOIN players pl ON pm.player_id = pl.id
  LEFT JOIN profiles p ON pl.user_id = p.id
  WHERE pm.is_active = true;

-- Fix vw_player_membership_usage_secure view  
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure;
CREATE VIEW public.vw_player_membership_usage_secure AS
  SELECT 
    pm.id as membership_id,
    pm.player_id,
    p.full_name as player_name,
    mt.name as membership_type_name,
    pm.allocated_classes,
    pm.used_classes,
    (pm.allocated_classes - pm.used_classes) as remaining_classes,
    pm.status,
    CASE 
      WHEN pm.end_date < CURRENT_DATE THEN extract(days from CURRENT_DATE - pm.end_date)
      ELSE extract(days from pm.end_date - CURRENT_DATE)
    END as days_left,
    CASE 
      WHEN (pm.allocated_classes - pm.used_classes) <= 0 OR pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as should_deactivate,
    CASE 
      WHEN pm.end_date < CURRENT_DATE THEN true
      ELSE false
    END as is_expired,
    pm.start_date,
    pm.end_date,
    mt.allocation_type
  FROM player_memberships pm
  JOIN membership_types mt ON pm.membership_type_id = mt.id
  LEFT JOIN players pl ON pm.player_id = pl.id
  LEFT JOIN profiles p ON pl.user_id = p.id
  WHERE pm.is_active = true;

-- Fix v_chat_display view
DROP VIEW IF EXISTS public.v_chat_display;
CREATE VIEW public.v_chat_display AS
  SELECT 
    c.id,
    c.name,
    c.chat_type,
    c.created_by,
    c.team_id,
    c.status,
    c.last_message_at,
    c.created_at,
    c.updated_at
  FROM chats c;

-- Set proper search paths for existing functions that are missing it
ALTER FUNCTION public.is_super_admin(uuid) SET search_path = public;
ALTER FUNCTION public.user_has_permission(uuid, text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, user_role) SET search_path = public;