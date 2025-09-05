-- Make location column nullable and add check constraint to ensure at least one location field is provided
ALTER TABLE public.schedules ALTER COLUMN location DROP NOT NULL;

-- Add check constraint to ensure at least one location field is provided
ALTER TABLE public.schedules ADD CONSTRAINT check_location_provided 
CHECK (location IS NOT NULL OR location_id IS NOT NULL);

-- Update any existing records that might have issues (this is a safety measure)
UPDATE public.schedules 
SET location = 'TBD' 
WHERE location IS NULL AND location_id IS NULL;