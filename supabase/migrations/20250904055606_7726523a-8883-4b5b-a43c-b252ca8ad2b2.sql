-- 1.1 Source of truth for selectable locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 1.2 Schedules table adjustments
-- Add FK column (new source of truth)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Make legacy text column nullable so it no longer blocks inserts
ALTER TABLE public.schedules
  ALTER COLUMN location DROP NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_locations_active_name ON public.locations(is_active, name);
CREATE INDEX IF NOT EXISTS idx_schedules_location_id ON public.schedules(location_id);

-- RLS policies for locations
CREATE POLICY "All authenticated users can view active locations" 
ON public.locations 
FOR SELECT 
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all locations" 
ON public.locations 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Optional backfill (if schedules.location has values)
INSERT INTO public.locations(name, created_by)
SELECT DISTINCT trim(location), auth.uid()
FROM public.schedules
WHERE location IS NOT NULL 
  AND trim(location) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.locations 
    WHERE name = trim(schedules.location)
  );

-- Update existing schedules with location_id
UPDATE public.schedules s
SET location_id = l.id
FROM public.locations l
WHERE s.location_id IS NULL
  AND s.location IS NOT NULL
  AND trim(s.location) = l.name;

-- Update trigger for locations
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();