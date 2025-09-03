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

-- Add location_id column to schedules table
ALTER TABLE public.schedules 
ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- Create some default locations
INSERT INTO public.locations (name, created_by) VALUES 
('Main Gym', auth.uid()),
('Practice Court', auth.uid()),
('Training Center', auth.uid())
ON CONFLICT (name) DO NOTHING;

-- Create a function to migrate existing location data
CREATE OR REPLACE FUNCTION migrate_schedule_locations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    schedule_record RECORD;
    location_uuid UUID;
    creator_id UUID;
BEGIN
    -- Get a creator ID (first super admin or first user)
    SELECT id INTO creator_id 
    FROM auth.users 
    WHERE id IN (
        SELECT user_id FROM user_roles 
        WHERE role = 'super_admin' AND is_active = true 
        LIMIT 1
    )
    OR id = (SELECT id FROM auth.users LIMIT 1)
    LIMIT 1;
    
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
END $$;

-- Run the migration
SELECT migrate_schedule_locations();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_schedule_locations();

-- Add trigger for updated_at on locations
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();