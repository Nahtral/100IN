-- Make nahtral@supernahtral.com a super admin
-- First, get the user ID from the profiles table
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get the user ID for the email
    SELECT id INTO target_user_id 
    FROM public.profiles 
    WHERE email = 'nahtral@supernahtral.com';
    
    -- If user exists, insert the super_admin role
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, is_active, approved_at, approved_by)
        VALUES (
            target_user_id,
            'super_admin'::user_role,
            true,
            now(),
            target_user_id  -- Self-approved since this is the bootstrap admin
        )
        ON CONFLICT (user_id, role) 
        DO UPDATE SET 
            is_active = true,
            approved_at = now(),
            approved_by = target_user_id;
        
        RAISE NOTICE 'Successfully assigned super_admin role to user: %', target_user_id;
    ELSE
        RAISE NOTICE 'User with email nahtral@supernahtral.com not found. They need to sign up first.';
    END IF;
END $$;