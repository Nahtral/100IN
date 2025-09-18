-- Create membership_usage_ledger table if not exists
CREATE TABLE IF NOT EXISTS public.membership_usage_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_membership_id UUID NOT NULL,
  attendance_id UUID NOT NULL,
  classes_deducted INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Add foreign key constraints
ALTER TABLE public.player_memberships 
ADD CONSTRAINT fk_player_memberships_player_id 
FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

ALTER TABLE public.player_memberships 
ADD CONSTRAINT fk_player_memberships_membership_type_id 
FOREIGN KEY (membership_type_id) REFERENCES public.membership_types(id) ON DELETE RESTRICT;

ALTER TABLE public.membership_usage_ledger 
ADD CONSTRAINT fk_membership_usage_ledger_player_membership_id 
FOREIGN KEY (player_membership_id) REFERENCES public.player_memberships(id) ON DELETE CASCADE;

ALTER TABLE public.membership_usage_ledger 
ADD CONSTRAINT fk_membership_usage_ledger_attendance_id 
FOREIGN KEY (attendance_id) REFERENCES public.attendance(id) ON DELETE CASCADE;

-- Add unique constraint to prevent double-charging
ALTER TABLE public.membership_usage_ledger 
ADD CONSTRAINT uq_membership_usage_ledger_attendance 
UNIQUE (player_membership_id, attendance_id);

-- Enable RLS on player_memberships
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;

-- Enable RLS on membership_usage_ledger  
ALTER TABLE public.membership_usage_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_memberships
CREATE POLICY "Super admins can manage player memberships" 
ON public.player_memberships 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage player memberships" 
ON public.player_memberships 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role));

CREATE POLICY "Players can view own memberships" 
ON public.player_memberships 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.players p 
  WHERE p.id = player_memberships.player_id AND p.user_id = auth.uid()
));

-- Block direct writes to player_memberships (force RPC usage)
CREATE POLICY "Block direct writes to player_memberships" 
ON public.player_memberships 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Block direct updates to player_memberships" 
ON public.player_memberships 
FOR UPDATE 
USING (false);

-- RLS policies for membership_usage_ledger
CREATE POLICY "Super admins can view membership ledger" 
ON public.membership_usage_ledger 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view membership ledger" 
ON public.membership_usage_ledger 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role));

CREATE POLICY "Block direct writes to membership ledger" 
ON public.membership_usage_ledger 
FOR INSERT 
WITH CHECK (false);

-- RPC: Assign membership
CREATE OR REPLACE FUNCTION public.rpc_assign_membership(
  p_player_id UUID,
  p_membership_type_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL,
  p_allocated_classes_override INTEGER DEFAULT NULL,
  p_auto_deactivate_when_used_up BOOLEAN DEFAULT true,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_type_record RECORD;
  calculated_classes INTEGER;
  new_membership_id UUID;
BEGIN
  -- Only super admins and staff can assign memberships
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'staff'::user_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;

  -- Get membership type details
  SELECT * INTO membership_type_record 
  FROM public.membership_types 
  WHERE id = p_membership_type_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership type not found or inactive';
  END IF;

  -- Calculate classes: use override if provided, otherwise use type default
  calculated_classes := COALESCE(p_allocated_classes_override, membership_type_record.allocated_classes, 10);

  -- Insert new membership
  INSERT INTO public.player_memberships (
    player_id,
    membership_type_id,
    start_date,
    end_date,
    allocated_classes,
    remaining_classes,
    status,
    auto_deactivate_when_used_up,
    manual_override_active,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_player_id,
    p_membership_type_id,
    p_start_date,
    p_end_date,
    calculated_classes,
    calculated_classes, -- Initially remaining = allocated
    'ACTIVE',
    p_auto_deactivate_when_used_up,
    false,
    p_notes,
    now(),
    now()
  ) RETURNING id INTO new_membership_id;

  -- Log the assignment
  INSERT INTO public.analytics_events (
    user_id, event_type, event_data, created_at
  ) VALUES (
    auth.uid(), 
    'membership_assigned',
    jsonb_build_object(
      'player_id', p_player_id,
      'membership_type_id', p_membership_type_id,
      'membership_id', new_membership_id,
      'allocated_classes', calculated_classes
    ),
    now()
  );

  RETURN new_membership_id;
END;
$$;

-- RPC: Apply attendance membership deduction
CREATE OR REPLACE FUNCTION public.rpc_apply_attendance_membership(p_attendance_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendance_record RECORD;
  active_membership_id UUID;
BEGIN
  -- Get attendance record
  SELECT * INTO attendance_record 
  FROM public.attendance 
  WHERE id = p_attendance_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record not found';
  END IF;

  -- Only deduct for 'present' status
  IF attendance_record.status != 'present' THEN
    RETURN;
  END IF;

  -- Check if already processed (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.membership_usage_ledger 
    WHERE attendance_id = p_attendance_id
  ) THEN
    RETURN; -- Already processed
  END IF;

  -- Find active membership for the player
  SELECT id INTO active_membership_id
  FROM public.player_memberships pm
  WHERE pm.player_id = attendance_record.player_id 
    AND pm.status = 'ACTIVE'
    AND (pm.end_date IS NULL OR pm.end_date >= CURRENT_DATE)
    AND pm.remaining_classes > 0
  ORDER BY COALESCE(pm.end_date, '9999-12-31'::date), pm.remaining_classes DESC
  LIMIT 1;

  -- If no active membership found, exit gracefully
  IF active_membership_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert usage record
  INSERT INTO public.membership_usage_ledger (
    player_membership_id,
    attendance_id,
    classes_deducted,
    created_at,
    notes
  ) VALUES (
    active_membership_id,
    p_attendance_id,
    1,
    now(),
    'Attendance deduction for event'
  );

  -- Update remaining classes
  UPDATE public.player_memberships 
  SET 
    remaining_classes = remaining_classes - 1,
    updated_at = now()
  WHERE id = active_membership_id;

  -- Auto-deactivate if used up and auto_deactivate is enabled
  UPDATE public.player_memberships 
  SET 
    status = 'INACTIVE',
    updated_at = now()
  WHERE id = active_membership_id 
    AND remaining_classes <= 0 
    AND auto_deactivate_when_used_up = true;

END;
$$;

-- Update attendance trigger to call membership deduction
CREATE OR REPLACE FUNCTION public.trg_attendance_membership_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call RPC to handle membership deduction
  PERFORM public.rpc_apply_attendance_membership(NEW.id);
  RETURN NEW;
END;
$$;