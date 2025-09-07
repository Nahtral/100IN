-- Fix the ambiguous column reference in bulk_convert_users_to_players function
CREATE OR REPLACE FUNCTION public.bulk_convert_users_to_players(
  user_ids UUID[],
  converted_by_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors TEXT[] := '{}';
  user_email TEXT;
  has_admin_role BOOLEAN;
  already_has_player_role BOOLEAN;
  already_has_player_record BOOLEAN;
BEGIN
  -- Only super admins can perform bulk conversions
  IF NOT is_super_admin(converted_by_user_id) THEN
    RAISE EXCEPTION 'Only super admins can perform bulk conversions';
  END IF;

  -- Process each user
  FOREACH user_id IN ARRAY user_ids
  LOOP
    BEGIN
      -- Get user info
      SELECT email INTO user_email FROM public.profiles WHERE id = user_id;
      
      IF user_email IS NULL THEN
        errors := array_append(errors, 'User not found: ' || user_id::text);
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Check if user has administrative roles (should not be converted)
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = user_id 
        AND ur.role IN ('super_admin', 'staff', 'coach', 'medical', 'partner') 
        AND ur.is_active = true
      ) INTO has_admin_role;

      IF has_admin_role THEN
        errors := array_append(errors, user_email || ': User has administrative role, skipping conversion');
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Check if user already has player role
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = user_id 
        AND ur.role = 'player' 
        AND ur.is_active = true
      ) INTO already_has_player_role;

      -- Check if user already has player record
      SELECT EXISTS(
        SELECT 1 FROM public.players p
        WHERE p.user_id = user_id
      ) INTO already_has_player_record;

      -- Assign player role if needed
      IF NOT already_has_player_role THEN
        INSERT INTO public.user_roles (
          user_id, 
          role, 
          is_active, 
          created_at,
          approved_by,
          approved_at,
          team_id
        )
        VALUES (
          user_id, 
          'player', 
          true, 
          now(),
          converted_by_user_id,
          now(),
          NULL
        )
        ON CONFLICT (user_id, role) 
        DO UPDATE SET 
          is_active = true, 
          created_at = now(),
          approved_by = converted_by_user_id,
          approved_at = now();
      END IF;

      -- Create player record if needed
      IF NOT already_has_player_record THEN
        INSERT INTO public.players (
          user_id,
          is_active,
          created_at,
          updated_at,
          total_shots,
          total_makes,
          shooting_percentage,
          avg_arc_degrees,
          avg_depth_inches,
          total_sessions
        )
        VALUES (
          user_id,
          true,
          now(),
          now(),
          0,
          0,
          0.00,
          0.00,
          0.00,
          0
        );
      END IF;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      errors := array_append(errors, user_email || ': ' || SQLERRM);
      error_count := error_count + 1;
    END;
  END LOOP;

  -- Log the bulk action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    converted_by_user_id, 
    'bulk_user_conversion',
    jsonb_build_object(
      'total_users', array_length(user_ids, 1),
      'success_count', success_count,
      'error_count', error_count,
      'errors', array_to_json(errors)
    ),
    now()
  );

  RETURN json_build_object(
    'success', error_count = 0,
    'success_count', success_count,
    'error_count', error_count,
    'errors', array_to_json(errors),
    'message', CASE 
      WHEN error_count = 0 THEN 'All users converted successfully'
      WHEN success_count = 0 THEN 'All conversions failed'
      ELSE 'Partial success: ' || success_count || ' converted, ' || error_count || ' failed'
    END
  );
END;
$$;