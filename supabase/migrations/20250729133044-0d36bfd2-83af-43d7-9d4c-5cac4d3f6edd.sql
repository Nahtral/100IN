-- Fix database function security by adding search_path protection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.has_role(_user_id, 'super_admin')
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_player_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- If a user is assigned the 'player' role and is active, create a player record
  IF NEW.role = 'player' AND NEW.is_active = true THEN
    INSERT INTO public.players (user_id, is_active, created_at, updated_at)
    VALUES (NEW.user_id, true, now(), now())
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_team_attendance_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
    team_record RECORD;
    schedule_team_id UUID;
BEGIN
    -- Get the team_id from the schedule via team_ids array
    SELECT UNNEST(team_ids) as team_id, id as schedule_id
    INTO schedule_team_id
    FROM public.schedules 
    WHERE id = COALESCE(NEW.schedule_id, OLD.schedule_id)
    LIMIT 1;

    -- Calculate stats for each team in the schedule
    FOR team_record IN 
        SELECT UNNEST(s.team_ids) as team_id, s.id as schedule_id
        FROM public.schedules s
        WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id)
    LOOP
        -- Update or insert team attendance record
        INSERT INTO public.team_attendance (
            team_id,
            schedule_id,
            total_players,
            present_count,
            absent_count,
            late_count,
            excused_count,
            attendance_percentage,
            updated_by
        )
        SELECT 
            team_record.team_id,
            team_record.schedule_id,
            COUNT(*) as total_players,
            COUNT(*) FILTER (WHERE pa.status = 'present') as present_count,
            COUNT(*) FILTER (WHERE pa.status = 'absent') as absent_count,
            COUNT(*) FILTER (WHERE pa.status = 'late') as late_count,
            COUNT(*) FILTER (WHERE pa.status = 'excused') as excused_count,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND((COUNT(*) FILTER (WHERE pa.status IN ('present', 'late')) * 100.0 / COUNT(*)), 2)
                ELSE 0 
            END as attendance_percentage,
            COALESCE(NEW.marked_by, OLD.marked_by)
        FROM public.players p
        LEFT JOIN public.player_attendance pa ON p.id = pa.player_id AND pa.schedule_id = team_record.schedule_id
        WHERE p.team_id = team_record.team_id AND p.is_active = true
        ON CONFLICT (team_id, schedule_id)
        DO UPDATE SET
            total_players = EXCLUDED.total_players,
            present_count = EXCLUDED.present_count,
            absent_count = EXCLUDED.absent_count,
            late_count = EXCLUDED.late_count,
            excused_count = EXCLUDED.excused_count,
            attendance_percentage = EXCLUDED.attendance_percentage,
            updated_by = EXCLUDED.updated_by,
            updated_at = now();
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create role change audit table for security tracking
CREATE TABLE IF NOT EXISTS public.role_change_audit (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    old_role TEXT,
    new_role TEXT NOT NULL,
    changed_by UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view role audit logs" 
ON public.role_change_audit 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- Update user_roles table to prevent direct role assignment during signup
-- Remove the trigger that automatically creates player roles
DROP TRIGGER IF EXISTS on_new_player_role ON public.user_roles;