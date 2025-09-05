-- Create tryout evaluation system with proper enums, tables, and triggers

-- Create enum for team placement
CREATE TYPE public.tryout_team AS ENUM ('Gold', 'Black', 'White');

-- Create tryout evaluations table
CREATE TABLE IF NOT EXISTS public.tryout_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT DEFAULT 'Tryout Evaluation',
  ball_handling SMALLINT NOT NULL CHECK (ball_handling BETWEEN 1 AND 5),
  shooting SMALLINT NOT NULL CHECK (shooting BETWEEN 1 AND 5),
  defense SMALLINT NOT NULL CHECK (defense BETWEEN 1 AND 5),
  iq SMALLINT NOT NULL CHECK (iq BETWEEN 1 AND 5),
  athleticism SMALLINT NOT NULL CHECK (athleticism BETWEEN 1 AND 5),
  total SMALLINT GENERATED ALWAYS AS (
    ball_handling + shooting + defense + iq + athleticism
  ) STORED,
  placement public.tryout_team,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add tryout fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS latest_tryout_total SMALLINT,
  ADD COLUMN IF NOT EXISTS latest_tryout_placement public.tryout_team,
  ADD COLUMN IF NOT EXISTS latest_tryout_date TIMESTAMP WITH TIME ZONE;

-- Create trigger function to set placement and update player profile
CREATE OR REPLACE FUNCTION public.trg_set_tryout_placement()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
  p public.tryout_team;
BEGIN
  -- Calculate placement based on total score
  IF NEW.total >= 22 THEN 
    p := 'Gold';
  ELSIF NEW.total >= 16 THEN 
    p := 'Black';
  ELSE 
    p := 'White';
  END IF;
  
  -- Set placement and updated timestamp
  NEW.placement := p;
  NEW.updated_at := now();

  -- Update player profile with latest tryout data
  UPDATE public.profiles
  SET 
    latest_tryout_total = NEW.total,
    latest_tryout_placement = p,
    latest_tryout_date = NEW.created_at
  WHERE id = NEW.player_id;

  RETURN NEW;
END $$;

-- Create the trigger
DROP TRIGGER IF EXISTS t_set_tryout_placement ON public.tryout_evaluations;
CREATE TRIGGER t_set_tryout_placement
  BEFORE INSERT OR UPDATE ON public.tryout_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_tryout_placement();

-- Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_tryout_player ON public.tryout_evaluations(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tryout_evaluator ON public.tryout_evaluations(evaluator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tryout_placement ON public.tryout_evaluations(placement, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_tryout_data ON public.profiles(latest_tryout_placement, latest_tryout_total);

-- Enable RLS
ALTER TABLE public.tryout_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can manage all tryout evaluations" ON public.tryout_evaluations
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Coaches can view and create tryout evaluations" ON public.tryout_evaluations
  FOR SELECT USING (has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Coaches can insert tryout evaluations" ON public.tryout_evaluations
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Evaluators can update their own evaluations" ON public.tryout_evaluations
  FOR UPDATE USING (evaluator_id = auth.uid() OR is_super_admin(auth.uid()));

-- Create RPC function to get approved players for tryout evaluation
CREATE OR REPLACE FUNCTION public.get_approved_players(search_term TEXT DEFAULT '')
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  latest_tryout_total SMALLINT,
  latest_tryout_placement public.tryout_team,
  latest_tryout_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.latest_tryout_total,
    p.latest_tryout_placement,
    p.latest_tryout_date
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'player'
    AND ur.is_active = true
    AND p.approval_status = 'approved'
    AND (search_term = '' OR p.full_name ILIKE '%' || search_term || '%')
  ORDER BY p.full_name;
$$;

-- Create RPC function to export tryout evaluations as CSV data
CREATE OR REPLACE FUNCTION public.export_tryout_evaluations(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  evaluator_filter UUID DEFAULT NULL,
  placement_filter TEXT DEFAULT NULL,
  event_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  player_name TEXT,
  evaluator_name TEXT,
  event_name TEXT,
  ball_handling SMALLINT,
  shooting SMALLINT,
  defense SMALLINT,
  iq SMALLINT,
  athleticism SMALLINT,
  total SMALLINT,
  placement TEXT,
  notes TEXT,
  evaluation_date TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.full_name as player_name,
    ep.full_name as evaluator_name,
    te.event_name,
    te.ball_handling,
    te.shooting,
    te.defense,
    te.iq,
    te.athleticism,
    te.total,
    te.placement::TEXT,
    te.notes,
    te.created_at::DATE::TEXT as evaluation_date
  FROM public.tryout_evaluations te
  JOIN public.profiles p ON te.player_id = p.id
  JOIN public.profiles ep ON te.evaluator_id = ep.id
  WHERE 
    (start_date IS NULL OR te.created_at::DATE >= start_date)
    AND (end_date IS NULL OR te.created_at::DATE <= end_date)
    AND (evaluator_filter IS NULL OR te.evaluator_id = evaluator_filter)
    AND (placement_filter IS NULL OR te.placement::TEXT = placement_filter)
    AND (event_filter IS NULL OR te.event_name ILIKE '%' || event_filter || '%')
  ORDER BY te.created_at DESC;
$$;