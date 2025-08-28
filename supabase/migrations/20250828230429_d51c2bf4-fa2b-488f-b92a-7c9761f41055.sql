-- Add video upload and analysis support to shots table
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_filename TEXT;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_analysis_status TEXT DEFAULT 'pending';
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_analysis_data JSONB;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_upload_date TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS video_duration_seconds NUMERIC;

-- Create video analysis jobs table
CREATE TABLE IF NOT EXISTS public.video_analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shot_id UUID,
  video_url TEXT NOT NULL,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  analysis_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video analysis jobs
ALTER TABLE public.video_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for video analysis jobs
CREATE POLICY "Super admins can manage all video analysis jobs"
ON public.video_analysis_jobs
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Players can view their own video analysis jobs"
ON public.video_analysis_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shots s 
    JOIN public.players p ON s.player_id = p.id
    WHERE s.id = video_analysis_jobs.shot_id 
    AND p.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_video_analysis_jobs_updated_at
BEFORE UPDATE ON public.video_analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for shot videos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('shot-videos', 'shot-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for shot videos
CREATE POLICY "Super admins can manage shot videos"
ON storage.objects
FOR ALL
USING (bucket_id = 'shot-videos' AND is_super_admin(auth.uid()));

CREATE POLICY "Players can upload their own shot videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'shot-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Players can view their own shot videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'shot-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);