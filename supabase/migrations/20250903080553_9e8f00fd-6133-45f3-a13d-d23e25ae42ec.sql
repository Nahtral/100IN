-- Create locations table without auth.uid() default
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
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

-- Add location_id column to schedules table
ALTER TABLE public.schedules 
ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Create default locations with a specific creator
DO $$
DECLARE
    creator_id UUID;
BEGIN
    -- Get the first user ID available
    SELECT id INTO creator_id FROM auth.users LIMIT 1;
    
    -- If no users exist, skip creating default locations
    IF creator_id IS NOT NULL THEN
        INSERT INTO public.locations (name, created_by) VALUES 
        ('Main Gym', creator_id),
        ('Practice Court', creator_id),
        ('Training Center', creator_id)
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

-- Migrate existing location data
DO $$
DECLARE
    schedule_record RECORD;
    location_uuid UUID;
    creator_id UUID;
BEGIN
    -- Get a creator ID (first user available)
    SELECT id INTO creator_id FROM auth.users LIMIT 1;
    
    -- Only proceed if we have a creator
    IF creator_id IS NOT NULL THEN
        -- Loop through schedules with location text but no location_id
        FOR schedule_record IN 
            SELECT id, location 
            FROM public.schedules 
            WHERE location IS NOT NULL 
            AND location != '' 
            AND location_id IS NULL
        LOOP
            -- Try to find existing location or create new one
            SELECT id INTO location_uuid 
            FROM public.locations 
            WHERE name = schedule_record.location;
            
            IF location_uuid IS NULL THEN
                -- Create new location
                INSERT INTO public.locations (name, created_by)
                VALUES (schedule_record.location, creator_id)
                RETURNING id INTO location_uuid;
            END IF;
            
            -- Update schedule with location_id
            UPDATE public.schedules 
            SET location_id = location_uuid
            WHERE id = schedule_record.id;
        END LOOP;
    END IF;
END $$;

-- Add trigger for updated_at on locations
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();