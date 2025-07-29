-- Create player_attendance table
CREATE TABLE public.player_attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    marked_by UUID NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(player_id, schedule_id)
);

-- Create team_attendance table for overall team stats
CREATE TABLE public.team_attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL,
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    total_players INTEGER NOT NULL DEFAULT 0,
    present_count INTEGER NOT NULL DEFAULT 0,
    absent_count INTEGER NOT NULL DEFAULT 0,
    late_count INTEGER NOT NULL DEFAULT 0,
    excused_count INTEGER NOT NULL DEFAULT 0,
    attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    updated_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(team_id, schedule_id)
);

-- Enable RLS
ALTER TABLE public.player_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_attendance
CREATE POLICY "Staff, coaches, and super admins can manage player attendance"
ON public.player_attendance
FOR ALL
USING (
    has_role(auth.uid(), 'staff'::user_role) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    is_super_admin(auth.uid())
);

CREATE POLICY "Players can view their own attendance"
ON public.player_attendance
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM players p 
        WHERE p.id = player_attendance.player_id 
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Parents can view their children's attendance"
ON public.player_attendance
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM players p 
        JOIN parent_child_relationships pcr ON p.user_id = pcr.child_id
        WHERE p.id = player_attendance.player_id 
        AND pcr.parent_id = auth.uid()
    )
);

-- RLS Policies for team_attendance
CREATE POLICY "Staff, coaches, and super admins can manage team attendance"
ON public.team_attendance
FOR ALL
USING (
    has_role(auth.uid(), 'staff'::user_role) OR 
    has_role(auth.uid(), 'coach'::user_role) OR 
    is_super_admin(auth.uid())
);

CREATE POLICY "All authenticated users can view team attendance"
ON public.team_attendance
FOR SELECT
USING (true);

-- Create function to update team attendance stats
CREATE OR REPLACE FUNCTION public.update_team_attendance_stats()
RETURNS TRIGGER AS $$
DECLARE
    team_record RECORD;
    schedule_team_id UUID;
BEGIN
    -- Get the team_id from the schedule via team_ids array
    SELECT UNNEST(team_ids) as team_id, id as schedule_id
    INTO schedule_team_id
    FROM schedules 
    WHERE id = COALESCE(NEW.schedule_id, OLD.schedule_id)
    LIMIT 1;

    -- Calculate stats for each team in the schedule
    FOR team_record IN 
        SELECT UNNEST(s.team_ids) as team_id, s.id as schedule_id
        FROM schedules s
        WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id)
    LOOP
        -- Update or insert team attendance record
        INSERT INTO team_attendance (
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
        FROM players p
        LEFT JOIN player_attendance pa ON p.id = pa.player_id AND pa.schedule_id = team_record.schedule_id
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
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_team_attendance_on_player_attendance
    AFTER INSERT OR UPDATE OR DELETE ON player_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_team_attendance_stats();

-- Create trigger for updated_at
CREATE TRIGGER update_player_attendance_updated_at
    BEFORE UPDATE ON player_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_attendance_updated_at
    BEFORE UPDATE ON team_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_player_attendance_player_schedule ON player_attendance(player_id, schedule_id);
CREATE INDEX idx_player_attendance_schedule ON player_attendance(schedule_id);
CREATE INDEX idx_team_attendance_team_schedule ON team_attendance(team_id, schedule_id);