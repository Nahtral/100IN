-- Phase 1: Fix Player Creation Logic & Email Uniqueness

-- Step 1: Add unique constraint on profiles.email to prevent duplicate accounts
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Step 2: Fix current data issues - deactivate unapproved players
UPDATE public.players 
SET is_active = false, 
    deactivation_reason = 'User not approved by admin',
    updated_at = now()
WHERE id IN (
  SELECT p.id 
  FROM public.players p
  JOIN public.profiles pr ON p.user_id = pr.id
  WHERE pr.approval_status != 'approved' AND p.is_active = true
);

-- Step 3: Create function to check if user can have player record
CREATE OR REPLACE FUNCTION public.can_create_player_record(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only approved users or super admins can have player records
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_user_id 
    AND (approval_status = 'approved' OR is_super_admin(target_user_id))
  );
END;
$$;

-- Step 4: Create trigger to prevent player record creation for non-approved users
CREATE OR REPLACE FUNCTION public.before_insert_player_approval_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is approved before allowing player record creation
  IF NOT public.can_create_player_record(NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot create player record: User must be approved first';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the trigger
DROP TRIGGER IF EXISTS trigger_before_insert_player_approval_check ON public.players;
CREATE TRIGGER trigger_before_insert_player_approval_check
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.before_insert_player_approval_check();

-- Step 5: Create function to automatically create player record when user gets approved
CREATE OR REPLACE FUNCTION public.create_player_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user just got approved and doesn't have a player record, create one
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    -- Check if player record doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM public.players WHERE user_id = NEW.id) THEN
      -- Create player record for newly approved user
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
      ) VALUES (
        NEW.id,
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
      
      -- Log the automatic player creation
      INSERT INTO public.analytics_events (
        user_id, event_type, event_data, created_at
      ) VALUES (
        NEW.id, 
        'player_record_created_on_approval',
        jsonb_build_object(
          'user_id', NEW.id,
          'email', NEW.email,
          'auto_created', true
        ),
        now()
      );
    ELSE
      -- If player record exists but is inactive, reactivate it
      UPDATE public.players 
      SET is_active = true, 
          deactivation_reason = null,
          updated_at = now()
      WHERE user_id = NEW.id AND is_active = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the approval trigger
DROP TRIGGER IF EXISTS trigger_create_player_on_approval ON public.profiles;
CREATE TRIGGER trigger_create_player_on_approval
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_player_on_approval();

-- Step 6: Create function to check email uniqueness (for frontend validation)
CREATE OR REPLACE FUNCTION public.is_email_available(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = check_email
  );
$$;