-- Enable RLS on new tables that don't have it enabled
ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for parent_child_relationships
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "Super admins can manage all relationships" ON public.parent_child_relationships;
  DROP POLICY IF EXISTS "Parents can view their own relationships" ON public.parent_child_relationships;
  DROP POLICY IF EXISTS "Parents can request relationships" ON public.parent_child_relationships;
  
  -- Create new policies
  CREATE POLICY "Super admins can manage all parent child relationships" 
  ON public.parent_child_relationships 
  FOR ALL 
  USING (is_super_admin(auth.uid()));

  CREATE POLICY "Parents can view their relationship requests" 
  ON public.parent_child_relationships 
  FOR SELECT 
  USING (auth.uid() = parent_id OR auth.uid() = child_id);

  CREATE POLICY "Parents can create relationship requests" 
  ON public.parent_child_relationships 
  FOR INSERT 
  WITH CHECK (auth.uid() = parent_id);
END
$$;

-- Create RLS policies for coach_assignments
DO $$
BEGIN
  CREATE POLICY "Super admins can manage all coach assignments" 
  ON public.coach_assignments 
  FOR ALL 
  USING (is_super_admin(auth.uid()));

  CREATE POLICY "Coaches can view their own assignments" 
  ON public.coach_assignments 
  FOR SELECT 
  USING (auth.uid() = coach_id OR has_role(auth.uid(), 'staff'::user_role));

  CREATE POLICY "Staff can manage coach assignments" 
  ON public.coach_assignments 
  FOR ALL 
  USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));
END
$$;

-- Create RLS policies for staff_departments
DO $$
BEGIN
  CREATE POLICY "Super admins can manage all staff departments" 
  ON public.staff_departments 
  FOR ALL 
  USING (is_super_admin(auth.uid()));

  CREATE POLICY "Staff can view department information" 
  ON public.staff_departments 
  FOR SELECT 
  USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));
END
$$;