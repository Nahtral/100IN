-- Add video upload and analysis support to shots table
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_filename TEXT;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_analysis_status TEXT DEFAULT 'pending';
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_analysis_data JSONB;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_upload_date TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_duration_seconds NUMERIC;

-- Create storage bucket for shot videos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('shot-videos', 'shot-videos', false)
ON CONFLICT (id) DO NOTHING;