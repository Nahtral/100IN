-- Create staff_team_assignments table for managing staff assignments to teams
CREATE TABLE public.staff_team_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL,
    team_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    assignment_type TEXT NOT NULL DEFAULT 'support' CHECK (assignment_type IN ('support', 'administrative', 'technical', 'medical')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(staff_id, team_id, status) -- Prevent duplicate active assignments
);

-- Enable RLS on staff_team_assignments table
ALTER TABLE public.staff_team_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staff_team_assignments
CREATE POLICY "Staff can view their own assignments" 
ON public.staff_team_assignments 
FOR SELECT 
USING (auth.uid() = staff_id OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins and staff can manage staff assignments" 
ON public.staff_team_assignments 
FOR ALL 
USING (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role));

-- Create indexes for better performance
CREATE INDEX idx_staff_team_assignments_staff_id ON public.staff_team_assignments(staff_id);
CREATE INDEX idx_staff_team_assignments_team_id ON public.staff_team_assignments(team_id);
CREATE INDEX idx_staff_team_assignments_status ON public.staff_team_assignments(status);

-- Create trigger for updated_at
CREATE TRIGGER update_staff_team_assignments_updated_at
    BEFORE UPDATE ON public.staff_team_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();