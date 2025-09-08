-- Fix all security definer views by recreating them as regular views
-- This should resolve the remaining security warnings

-- Drop and recreate v_chat_display as regular view
DROP VIEW IF EXISTS public.v_chat_display CASCADE;

CREATE VIEW public.v_chat_display AS
SELECT 
  id AS chat_id,
  name AS original_name,
  chat_type,
  status,
  is_archived,
  is_pinned,
  created_at,
  updated_at,
  last_message_at,
  CASE
    WHEN chat_type = 'group' THEN COALESCE(name, 'Group Chat')
    WHEN chat_type = 'private' THEN COALESCE(
      (SELECT p.full_name
       FROM chat_participants cp2
       JOIN profiles p ON cp2.user_id = p.id
       WHERE cp2.chat_id = c.id AND cp2.user_id != auth.uid()
       LIMIT 1), 'Private Chat')
    ELSE COALESCE(name, 'Chat')
  END AS display_name
FROM chats c;

-- Drop and recreate v_partner_summary as regular view  
DROP VIEW IF EXISTS public.v_partner_summary CASCADE;

CREATE VIEW public.v_partner_summary AS
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
  COALESCE(SUM(pts.sponsorship_amount), 0) AS total_sponsorship_value,
  COUNT(pts.id) AS total_sponsorships,
  COUNT(pts.id) FILTER (WHERE pts.status = 'active') AS active_sponsorships,
  MIN(pts.start_date) AS earliest_partnership,
  MAX(pts.end_date) AS latest_partnership
FROM partner_organizations po
LEFT JOIN partner_team_sponsorships pts ON po.id = pts.partner_organization_id
GROUP BY 
  po.id, po.name, po.partnership_type, po.partnership_status,
  po.contact_person, po.contact_email, po.contact_phone, po.description,
  po.partnership_value, po.contract_start_date, po.contract_end_date,
  po.created_at, po.updated_at;

-- Set security barriers on all views for proper RLS enforcement
ALTER VIEW public.v_chat_display SET (security_barrier = true);
ALTER VIEW public.v_partner_summary SET (security_barrier = true);
ALTER VIEW public.vw_player_membership_usage_secure SET (security_barrier = true);