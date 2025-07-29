-- Update schedules table to support multiple teams and enhanced recurring functionality
-- Change team_id to team_ids array to support multiple teams
ALTER TABLE public.schedules 
ADD COLUMN team_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Migrate existing team_id data to team_ids array
UPDATE public.schedules 
SET team_ids = CASE 
  WHEN team_id IS NOT NULL THEN ARRAY[team_id]
  ELSE ARRAY[]::UUID[]
END;

-- Drop the old team_id column
ALTER TABLE public.schedules 
DROP COLUMN team_id;

-- Add recurrence_days_of_week for better recurring support
ALTER TABLE public.schedules 
ADD COLUMN recurrence_days_of_week INTEGER[] DEFAULT NULL;

-- Create index for better performance on team queries
CREATE INDEX idx_schedules_team_ids ON public.schedules USING GIN(team_ids);

-- Update RLS policies to restrict to super admin and staff only
DROP POLICY IF EXISTS "Staff and coaches can manage schedules" ON public.schedules;

CREATE POLICY "Only staff and super admins can manage schedules" 
ON public.schedules 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

-- Keep the existing view policy for all authenticated users
-- This allows everyone to view schedules but only staff/super admins to modify