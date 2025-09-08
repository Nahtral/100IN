-- Create a function to get approved players with player role
CREATE OR REPLACE FUNCTION get_approved_players()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.avatar_url
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.is_approved = true
    AND ur.role = 'player'::user_role
    AND ur.is_active = true
  ORDER BY p.full_name;
$$;