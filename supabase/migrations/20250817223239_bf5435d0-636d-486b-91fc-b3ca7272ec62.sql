-- Fix potential enum type issues and ensure RLS policies work correctly

-- First, let's make sure the user_role enum exists and has all needed values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'staff', 'coach', 'player', 'parent', 'medical', 'partner');
    ELSE
        -- Add any missing enum values
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coach';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'player';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'medical';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors if values already exist
            NULL;
        END;
    END IF;
END $$;

-- Ensure the has_role function is working correctly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$function$;

-- Ensure teams table has proper access
DROP POLICY IF EXISTS "All authenticated users can view teams" ON public.teams;
CREATE POLICY "All authenticated users can view teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (true);

-- Ensure players table has proper access  
DROP POLICY IF EXISTS "All authenticated users can view players" ON public.players;
CREATE POLICY "All authenticated users can view players" 
ON public.players 
FOR SELECT 
TO authenticated
USING (true);

-- Make sure the basic tables exist with correct structure
CREATE TABLE IF NOT EXISTS public.players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    jersey_number integer,
    position text,
    height text,
    weight text,
    date_of_birth date,
    emergency_contact_name text,
    emergency_contact_phone text,
    medical_notes text,
    total_shots integer DEFAULT 0,
    total_makes integer DEFAULT 0,
    shooting_percentage numeric DEFAULT 0,
    avg_arc_degrees numeric,
    avg_depth_inches numeric,
    last_session_date timestamp with time zone,
    total_sessions integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;