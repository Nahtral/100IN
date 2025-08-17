-- Create the schedules table that's referenced throughout the app
CREATE TABLE IF NOT EXISTS public.schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    event_type text NOT NULL DEFAULT 'game',
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    location text NOT NULL,
    opponent text,
    team_ids uuid[] DEFAULT '{}',
    is_recurring boolean DEFAULT false,
    recurrence_pattern text,
    recurrence_end_date date,
    recurrence_days_of_week integer[],
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on schedules table
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view schedules
CREATE POLICY "All authenticated users can view schedules" 
ON public.schedules 
FOR SELECT 
TO authenticated
USING (true);

-- Allow staff, coaches, and super admins to manage schedules
CREATE POLICY "Staff and coaches can manage schedules" 
ON public.schedules 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

-- Add some sample schedule data
INSERT INTO public.schedules (title, event_type, start_time, end_time, location, team_ids, created_by)
SELECT 
    'Basketball Practice' as title,
    'practice' as event_type,
    now() + interval '1 day' as start_time,
    now() + interval '1 day' + interval '2 hours' as end_time,
    'Main Gym' as location,
    ARRAY[t.id] as team_ids,
    (SELECT id FROM auth.users LIMIT 1) as created_by
FROM teams t
LIMIT 1
ON CONFLICT DO NOTHING;