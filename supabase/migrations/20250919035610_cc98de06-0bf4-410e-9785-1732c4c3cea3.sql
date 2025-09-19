-- Drop all versions of rpc_assign_membership function explicitly
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership(uuid, uuid, date, date, integer) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_assign_membership CASCADE;

-- Create canonical version with single signature
CREATE FUNCTION public.rpc_assign_membership(
  p_player_id uuid,
  p_membership_type_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_override_class_count integer DEFAULT NULL,
  p_auto_deactivate_when_used_up boolean DEFAULT true,
  p_notes text DEFAULT NULL
) RETURNS public.player_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mt record;
  v_quota integer;
  rec public.player_memberships;
BEGIN
  SELECT * INTO mt FROM public.membership_types WHERE id = p_membership_type_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid membership_type_id or inactive';
  END IF;

  -- Determine quota based on type
  IF mt.allocation_type = 'CLASS_COUNT' THEN
    v_quota := COALESCE(p_override_class_count, mt.allocated_classes, mt.class_count);
    IF v_quota IS NULL THEN
      RAISE EXCEPTION 'Please enter a class count or choose a type with a default quota.';
    END IF;
  ELSE
    v_quota := NULL; -- UNLIMITED
  END IF;

  INSERT INTO public.player_memberships(
    player_id, membership_type_id, start_date, end_date,
    classes_total, classes_used, auto_deactivate_when_used_up, status, notes, created_by,
    override_class_count
  )
  VALUES (
    p_player_id, p_membership_type_id, p_start_date, p_end_date,
    v_quota, 0, p_auto_deactivate_when_used_up, 'ACTIVE', p_notes, auth.uid(),
    p_override_class_count
  )
  RETURNING * INTO rec;

  RETURN rec;
END $$;