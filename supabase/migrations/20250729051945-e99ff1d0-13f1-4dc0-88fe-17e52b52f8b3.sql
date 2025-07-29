-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  video_filename TEXT NOT NULL,
  video_size_mb NUMERIC NOT NULL,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  analysis_data JSONB,
  shooting_score INTEGER,
  passing_score INTEGER,
  dribbling_score INTEGER,
  foot_speed_score INTEGER,
  vertical_jump_score INTEGER,
  movement_score INTEGER,
  body_alignment_score INTEGER,
  injury_risk_level TEXT,
  development_plan TEXT,
  feedback TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies for evaluations
CREATE POLICY "Super admins can manage all evaluations" 
ON public.evaluations 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view evaluations" 
ON public.evaluations 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for evaluation videos
INSERT INTO storage.buckets (id, name, public) VALUES ('evaluation-videos', 'evaluation-videos', false);

-- Create storage policies for evaluation videos
CREATE POLICY "Super admins can upload evaluation videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'evaluation-videos' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view evaluation videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'evaluation-videos' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update evaluation videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'evaluation-videos' AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete evaluation videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'evaluation-videos' AND is_super_admin(auth.uid()));