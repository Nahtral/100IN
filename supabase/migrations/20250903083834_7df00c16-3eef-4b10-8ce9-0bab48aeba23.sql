-- Debug and fix the current_user_v view and functions

-- First, let's check what auth.uid() returns and debug the view
-- Drop the old view and recreate it with better logic

DROP VIEW IF EXISTS public.current_user_v;

-- Create a more reliable view that handles all cases
CREATE VIEW public.current_user_v AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.approval_status,
  COALESCE(
    (SELECT ur.role::text 
     FROM public.user_roles ur 
     WHERE ur.user_id = p.id 
       AND ur.is_active = true 
     ORDER BY CASE ur.role
       WHEN 'super_admin' THEN 1
       WHEN 'staff' THEN 2
       WHEN 'coach' THEN 3
       WHEN 'medical' THEN 4
       WHEN 'partner' THEN 5
       WHEN 'parent' THEN 6
       WHEN 'player' THEN 7
       ELSE 8
     END
     LIMIT 1),
    'player'
  ) as primary_role,
  EXISTS(
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id 
      AND ur.role = 'super_admin'
      AND ur.is_active = true
  ) as is_super_admin,
  (
    SELECT array_agg(ur2.role::text) 
    FROM public.user_roles ur2 
    WHERE ur2.user_id = p.id 
      AND ur2.is_active = true
  ) as all_roles,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.id = auth.uid();

-- Grant select permission on the view
GRANT SELECT ON public.current_user_v TO authenticated;

-- Create a simpler test function to debug auth.uid()
CREATE OR REPLACE FUNCTION public.debug_current_user()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'user_exists_in_profiles', EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid()),
    'user_roles_count', (SELECT COUNT(*) FROM public.user_roles WHERE user_id = auth.uid()),
    'active_roles', (
      SELECT array_agg(role::text) 
      FROM public.user_roles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
$$;