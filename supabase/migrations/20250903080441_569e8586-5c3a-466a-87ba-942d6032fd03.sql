-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on locations table
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for locations
CREATE POLICY "All authenticated users can view active locations"
ON public.locations
FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all locations"
ON public.locations
FOR ALL
USING (is_super_admin(auth.uid()));

-- Update event_type enum to include new values
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'FNL';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'DBL';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'Team Building';

-- Add location_id column to schedules table
ALTER TABLE public.schedules 
ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Create some default locations and migrate existing location data
INSERT INTO public.locations (name, created_by) VALUES 
('Main Gym', (SELECT id FROM auth.users LIMIT 1)),
('Practice Court', (SELECT id FROM auth.users LIMIT 1)),
('Training Center', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- Migrate existing location text to locations table and update location_id
DO $$
DECLARE
    schedule_record RECORD;
    location_id UUID;
BEGIN
    -- Loop through schedules with location text
    FOR schedule_record IN 
        SELECT id, location 
        FROM public.schedules 
        WHERE location IS NOT NULL AND location != '' AND location_id IS NULL
    LOOP
        -- Try to find existing location or create new one
        SELECT id INTO location_id 
        FROM public.locations 
        WHERE name = schedule_record.location;
        
        IF location_id IS NULL THEN
            -- Create new location
            INSERT INTO public.locations (name, created_by)
            VALUES (schedule_record.location, (SELECT id FROM auth.users LIMIT 1))
            RETURNING id INTO location_id;
        END IF;
        
        -- Update schedule with location_id
        UPDATE public.schedules 
        SET location_id = location_id
        WHERE id = schedule_record.id;
    END LOOP;
END $$;

-- Add trigger for updated_at on locations
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();