-- Fix membership architecture alignment
-- Step 1: Add missing columns to player_memberships if they don't exist
DO $$ 
BEGIN
    -- Add override_class_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_memberships' AND column_name = 'override_class_count') THEN
        ALTER TABLE player_memberships ADD COLUMN override_class_count integer;
    END IF;
    
    -- Add remaining_classes column (rename classes_remaining if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_memberships' AND column_name = 'classes_remaining') THEN
        ALTER TABLE player_memberships RENAME COLUMN classes_remaining TO remaining_classes;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_memberships' AND column_name = 'remaining_classes') THEN
        ALTER TABLE player_memberships ADD COLUMN remaining_classes integer;
    END IF;
END $$;

-- Step 2: Add class_count alias to membership_types (use allocated_classes)
CREATE OR REPLACE VIEW membership_types_v AS
SELECT 
    id,
    name,
    allocation_type,
    allocated_classes as class_count,
    allocated_classes,
    start_date_required,
    end_date_required,
    is_active,
    created_at,
    updated_at
FROM membership_types;

-- Step 3: Create trigger function to set initial remaining_classes
CREATE OR REPLACE FUNCTION fn_pm_set_initial_remaining()
RETURNS TRIGGER AS $$
BEGIN
    -- Set remaining_classes from override_class_count or membership type's allocated_classes
    IF NEW.remaining_classes IS NULL THEN
        SELECT COALESCE(NEW.override_class_count, mt.allocated_classes)
        INTO NEW.remaining_classes
        FROM membership_types mt
        WHERE mt.id = NEW.membership_type_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on player_memberships
DROP TRIGGER IF EXISTS tr_pm_set_initial_remaining ON player_memberships;
CREATE TRIGGER tr_pm_set_initial_remaining
    BEFORE INSERT ON player_memberships
    FOR EACH ROW
    EXECUTE FUNCTION fn_pm_set_initial_remaining();

-- Step 5: Create/update rpc_assign_membership function
CREATE OR REPLACE FUNCTION rpc_assign_membership(
    p_player_id uuid,
    p_membership_type_id uuid,
    p_start_date date,
    p_end_date date DEFAULT NULL,
    p_override_class_count integer DEFAULT NULL,
    p_auto_deactivate_when_used_up boolean DEFAULT true,
    p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_membership_id uuid;
    v_default_count integer;
    v_remaining integer;
BEGIN
    -- Only super admins can assign memberships
    IF NOT is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: Only super admins can assign memberships';
    END IF;

    -- Get default class count from membership type
    SELECT allocated_classes INTO v_default_count
    FROM membership_types
    WHERE id = p_membership_type_id AND is_active = true;
    
    IF v_default_count IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive membership type';
    END IF;

    -- Calculate remaining classes
    v_remaining := COALESCE(p_override_class_count, v_default_count);

    -- Deactivate any existing active memberships for this player
    UPDATE player_memberships 
    SET status = 'INACTIVE', updated_at = now()
    WHERE player_id = p_player_id AND status = 'ACTIVE';

    -- Insert new membership
    INSERT INTO player_memberships (
        player_id,
        membership_type_id,
        start_date,
        end_date,
        override_class_count,
        remaining_classes,
        status,
        auto_deactivate_when_used_up,
        notes,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        p_player_id,
        p_membership_type_id,
        p_start_date,
        p_end_date,
        p_override_class_count,
        v_remaining,
        'ACTIVE',
        p_auto_deactivate_when_used_up,
        p_notes,
        auth.uid(),
        now(),
        now()
    ) RETURNING id INTO v_membership_id;

    -- Log the assignment
    INSERT INTO analytics_events (
        user_id, event_type, event_data, created_at
    ) VALUES (
        auth.uid(), 
        'membership_assigned',
        jsonb_build_object(
            'player_id', p_player_id,
            'membership_type_id', p_membership_type_id,
            'remaining_classes', v_remaining,
            'membership_id', v_membership_id
        ),
        now()
    );

    RETURN v_membership_id;
END;
$$;