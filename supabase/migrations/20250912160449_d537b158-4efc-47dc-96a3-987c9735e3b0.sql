-- PHASE 1B: Fix Security Definer Views and remaining critical issues (CORRECTED)

-- Fix Security Definer Views by converting them to security_invoker
-- This prevents the views from bypassing RLS

-- Fix v_partner_summary view with correct column names
DROP VIEW IF EXISTS public.v_partner_summary;
CREATE VIEW public.v_partner_summary 
WITH (security_invoker = on)
AS
SELECT 
  po.id,
  po.name,
  po.partnership_type,
  po.partnership_status AS status,
  po.contact_person AS contact_name,
  po.contact_email,
  po.contact_phone,
  po.description,
  po.partnership_value,
  po.contract_start_date,
  po.contract_end_date,
  po.created_at,
  po.updated_at,
  COALESCE(SUM(pts.sponsorship_amount), 0) as total_sponsorship_value,
  COUNT(pts.id) as total_sponsorships,
  COUNT(pts.id) FILTER (WHERE pts.status = 'active') as active_sponsorships,
  MIN(pts.start_date) as earliest_partnership,
  MAX(pts.end_date) as latest_partnership
FROM public.partner_organizations po
LEFT JOIN public.partner_team_sponsorships pts ON po.id = pts.partner_organization_id
GROUP BY po.id, po.name, po.partnership_type, po.partnership_status, po.contact_person, 
         po.contact_email, po.contact_phone, po.description, po.partnership_value, 
         po.contract_start_date, po.contract_end_date, po.created_at, po.updated_at;

-- Fix v_chat_display view to be security_invoker
DROP VIEW IF EXISTS public.v_chat_display;
CREATE VIEW public.v_chat_display
WITH (security_invoker = on)
AS
SELECT 
    c.id AS chat_id,
    c.name AS original_name,
    c.chat_type,
    c.status,
    c.is_archived,
    c.is_pinned,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    CASE
        WHEN c.chat_type = 'group' THEN COALESCE(c.name, 'Group Chat')
        WHEN c.chat_type = 'private' THEN COALESCE(
            (SELECT p.full_name
             FROM chat_participants cp2
             JOIN profiles p ON cp2.user_id = p.id
             WHERE cp2.chat_id = c.id AND cp2.user_id != auth.uid()
             LIMIT 1), 'Private Chat')
        ELSE COALESCE(c.name, 'Chat')
    END AS display_name
FROM public.chats c;

-- Fix vw_player_membership_usage_secure view to be security_invoker
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure;
CREATE VIEW public.vw_player_membership_usage_secure
WITH (security_invoker = on)
AS
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
        WHEN pm.allocated_classes_override IS NOT NULL THEN pm.allocated_classes_override - COALESCE(SUM(mu.classes_used), 0)
        WHEN mt.allocation_type = 'CLASS_COUNT' THEN mt.allocated_classes - COALESCE(SUM(mu.classes_used), 0)
        ELSE NULL
    END AS remaining_classes,
    pm.status,
    pm.start_date,
    pm.end_date,
    CASE
        WHEN pm.end_date IS NOT NULL THEN pm.end_date - CURRENT_DATE
        ELSE NULL
    END AS days_left,
    CASE
        WHEN pm.status = 'INACTIVE' THEN true
        WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
        WHEN mt.allocation_type = 'CLASS_COUNT' AND pm.auto_deactivate_when_used_up AND 
             COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) <= COALESCE(SUM(mu.classes_used), 0) THEN true
        ELSE false
    END AS should_deactivate,
    CASE
        WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
        ELSE false
    END AS is_expired
FROM public.player_memberships pm
JOIN public.membership_types mt ON pm.membership_type_id = mt.id
JOIN public.players p ON pm.player_id = p.id
JOIN public.profiles prof ON p.user_id = prof.id
LEFT JOIN public.membership_usage mu ON pm.id = mu.player_membership_id
GROUP BY pm.id, pm.player_id, prof.full_name, mt.name, mt.allocation_type, 
         mt.allocated_classes, pm.allocated_classes_override, pm.status, 
         pm.start_date, pm.end_date, pm.auto_deactivate_when_used_up;