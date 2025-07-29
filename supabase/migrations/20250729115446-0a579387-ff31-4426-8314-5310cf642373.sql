-- Enhance news_updates table to support media and additional categories
ALTER TABLE public.news_updates 
ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
ADD COLUMN IF NOT EXISTS media_urls TEXT[],
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excerpt TEXT;

-- Create media_uploads table for managing uploaded media
CREATE TABLE IF NOT EXISTS public.media_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID REFERENCES public.news_updates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  orientation TEXT CHECK (orientation IN ('landscape', 'portrait', 'square')),
  dimensions JSONB, -- {width: number, height: number}
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on media_uploads
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for media_uploads
CREATE POLICY "Super admins can manage all media uploads" 
ON public.media_uploads 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage media uploads" 
ON public.media_uploads 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "All authenticated users can view media uploads" 
ON public.media_uploads 
FOR SELECT 
USING (true);

-- Create storage bucket for news media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news-media', 'news-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for news media
CREATE POLICY "Anyone can view news media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'news-media');

CREATE POLICY "Super admins can upload news media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'news-media' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update news media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'news-media' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete news media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'news-media' AND is_super_admin(auth.uid()));

-- Add trigger for updated_at on media_uploads
CREATE TRIGGER update_media_uploads_updated_at
BEFORE UPDATE ON public.media_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update news categories to include the new ones
COMMENT ON COLUMN public.news_updates.category IS 'Categories: general, team, medical, schedule, achievement, announcement, panthers, player_profiles, highlights, player_of_the_week, panthers_alumni, ncaa, updates, schedule_changes';