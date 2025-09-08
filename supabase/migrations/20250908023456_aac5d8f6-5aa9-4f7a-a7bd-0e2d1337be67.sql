-- Simple fix for inactive player roles
-- Just activate the roles for approved users without triggering any functions

UPDATE public.user_roles 
SET is_active = true
WHERE role = 'player' 
AND is_active = false 
AND user_id IN (
  SELECT id FROM public.profiles 
  WHERE approval_status = 'approved'
);