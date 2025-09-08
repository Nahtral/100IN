-- Fix inactive player roles for approved users
-- This addresses the issue where approved users have inactive player roles

UPDATE public.user_roles 
SET is_active = true, 
    approved_at = COALESCE(approved_at, now()),
    approved_by = COALESCE(approved_by, (
      SELECT id FROM public.profiles 
      WHERE id IN (
        SELECT user_id FROM public.user_roles 
        WHERE role = 'super_admin' AND is_active = true 
        LIMIT 1
      )
    ))
WHERE role = 'player' 
AND is_active = false 
AND user_id IN (
  SELECT id FROM public.profiles 
  WHERE approval_status = 'approved'
);