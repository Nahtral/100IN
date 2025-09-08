-- Create membership management system tables and functions (simplified version)

-- First, check if tables already exist and drop them if they do to ensure clean creation
DROP TABLE IF EXISTS public.membership_usage CASCADE;
DROP TABLE IF EXISTS public.player_memberships CASCADE;
DROP TABLE IF EXISTS public.membership_types CASCADE;
DROP VIEW IF EXISTS public.vw_player_membership_usage_secure CASCADE;

-- Create membership types table
CREATE TABLE public.membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('CLASS_COUNT', 'UNLIMITED', 'DATE_RANGE')),
  allocated_classes INTEGER,
  start_date_required BOOLEAN NOT NULL DEFAULT true,
  end_date_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player memberships table
CREATE TABLE public.player_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  membership_type_id UUID NOT NULL REFERENCES public.membership_types(id),
  start_date DATE NOT NULL,
  end_date DATE,
  allocated_classes_override INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PAUSED')),
  auto_deactivate_when_used_up BOOLEAN NOT NULL DEFAULT true,
  manual_override_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create membership usage tracking table
CREATE TABLE public.membership_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_membership_id UUID NOT NULL REFERENCES public.player_memberships(id),
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  classes_used INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tables
ALTER TABLE public.membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_memberships ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.membership_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for membership_types
CREATE POLICY "All authenticated users can view active membership types"
ON public.membership_types
FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage membership types"
ON public.membership_types
FOR ALL
USING (is_super_admin(auth.uid()));

-- Create RLS policies for player_memberships
CREATE POLICY "Players can view their own memberships"
ON public.player_memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_memberships.player_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view their children's memberships"
ON public.player_memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.parent_child_relationships pcr ON p.user_id = pcr.child_id
    WHERE p.id = player_memberships.player_id 
    AND pcr.parent_id = auth.uid()
  )
);

CREATE POLICY "Staff and medical can view all memberships"
ON public.player_memberships
FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'medical'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can manage all memberships"
ON public.player_memberships
FOR ALL
USING (is_super_admin(auth.uid()));

-- Create RLS policies for membership_usage
CREATE POLICY "Staff can manage membership usage"
ON public.membership_usage
FOR ALL
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Players can view their own usage"
ON public.membership_usage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.player_memberships pm
    JOIN public.players p ON pm.player_id = p.id
    WHERE pm.id = membership_usage.player_membership_id 
    AND p.user_id = auth.uid()
  )
);

-- Create view for membership usage summary
CREATE VIEW public.vw_player_membership_usage_secure AS
SELECT 
  pm.id as membership_id,
  pm.player_id,
  prof.full_name as player_name,
  mt.name as membership_type_name,
  mt.allocation_type,
  CASE 
    WHEN pm.allocated_classes_override IS NOT NULL THEN pm.allocated_classes_override
    WHEN mt.allocation_type = 'CLASS_COUNT' THEN mt.allocated_classes
    ELSE NULL
  END as allocated_classes,
  COALESCE(SUM(mu.classes_used), 0)::INTEGER as used_classes,
  CASE 
    WHEN mt.allocation_type = 'UNLIMITED' THEN NULL
    WHEN pm.allocated_classes_override IS NOT NULL THEN pm.allocated_classes_override - COALESCE(SUM(mu.classes_used), 0)
    WHEN mt.allocation_type = 'CLASS_COUNT' THEN mt.allocated_classes - COALESCE(SUM(mu.classes_used), 0)
    ELSE NULL
  END as remaining_classes,
  pm.status,
  pm.start_date,
  pm.end_date,
  CASE 
    WHEN pm.end_date IS NOT NULL THEN (pm.end_date - CURRENT_DATE)
    ELSE NULL
  END as days_left,
  CASE 
    WHEN pm.status = 'INACTIVE' THEN true
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    WHEN mt.allocation_type = 'CLASS_COUNT' AND pm.auto_deactivate_when_used_up AND 
         COALESCE(pm.allocated_classes_override, mt.allocated_classes, 0) <= COALESCE(SUM(mu.classes_used), 0) THEN true
    ELSE false
  END as should_deactivate,
  CASE 
    WHEN pm.end_date IS NOT NULL AND pm.end_date < CURRENT_DATE THEN true
    ELSE false
  END as is_expired
FROM public.player_memberships pm
JOIN public.membership_types mt ON pm.membership_type_id = mt.id
JOIN public.players p ON pm.player_id = p.id
JOIN public.profiles prof ON p.user_id = prof.id
LEFT JOIN public.membership_usage mu ON pm.id = mu.player_membership_id
GROUP BY pm.id, pm.player_id, prof.full_name, mt.name, mt.allocation_type, mt.allocated_classes, 
         pm.allocated_classes_override, pm.status, pm.start_date, pm.end_date, pm.auto_deactivate_when_used_up;

-- Create the membership summary function
CREATE OR REPLACE FUNCTION public.fn_get_membership_summary(target_player_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(summary)
  FROM (
    SELECT 
      membership_id,
      allocated_classes,
      used_classes,
      remaining_classes,
      status,
      membership_type_name as type,
      days_left,
      should_deactivate,
      is_expired,
      start_date,
      end_date,
      allocation_type
    FROM vw_player_membership_usage_secure 
    WHERE player_id = target_player_id
    ORDER BY start_date DESC
    LIMIT 1
  ) summary;
$$;

-- Insert default membership types
INSERT INTO public.membership_types (name, allocation_type, allocated_classes, start_date_required, end_date_required) VALUES
('10 Class Package', 'CLASS_COUNT', 10, true, false),
('20 Class Package', 'CLASS_COUNT', 20, true, false),
('Unlimited Monthly', 'UNLIMITED', NULL, true, false),
('Summer Camp Pass', 'DATE_RANGE', NULL, true, true);