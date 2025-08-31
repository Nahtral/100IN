-- Add missing columns to parent_child_relationships table
ALTER TABLE public.parent_child_relationships 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Update any existing records to have 'pending' status
UPDATE public.parent_child_relationships 
SET status = 'pending' 
WHERE status IS NULL;

-- Now create the functions
CREATE OR REPLACE FUNCTION public.get_coaches_with_assignments()
RETURNS TABLE(
  coach_id UUID,
  coach_name TEXT,
  coach_email TEXT,
  team_assignments JSONB,
  player_assignments JSONB,
  total_assignments BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as coach_id,
    p.full_name as coach_name,
    p.email as coach_email,
    '[]'::jsonb as team_assignments,
    '[]'::jsonb as player_assignments,
    0::bigint as total_assignments
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'coach' AND ur.is_active = true
  GROUP BY p.id, p.full_name, p.email;
$$;

CREATE OR REPLACE FUNCTION public.get_parent_child_requests()
RETURNS TABLE(
  request_id UUID,
  parent_name TEXT,
  parent_email TEXT,
  child_name TEXT,
  child_email TEXT,
  relationship_type TEXT,
  status TEXT,
  requested_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pcr.id as request_id,
    p_parent.full_name as parent_name,
    p_parent.email as parent_email,
    p_child.full_name as child_name,
    p_child.email as child_email,
    pcr.relationship_type,
    pcr.status,
    pcr.requested_at
  FROM public.parent_child_relationships pcr
  JOIN public.profiles p_parent ON pcr.parent_id = p_parent.id
  JOIN public.profiles p_child ON pcr.child_id = p_child.id
  ORDER BY pcr.requested_at DESC;
$$;