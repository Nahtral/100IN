-- Create partner_communications table for real partner messaging
CREATE TABLE public.partner_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  partner_organization_id UUID,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('message', 'meeting', 'report', 'update', 'contract')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('team_manager', 'executive_team', 'analytics_team', 'partner', 'all')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  response_required BOOLEAN DEFAULT false,
  response_deadline TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shot_analysis table for real ShotIQ data
CREATE TABLE public.shot_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shot_id UUID NOT NULL,
  arc_degrees NUMERIC(5,2),
  depth_inches NUMERIC(5,2),
  lr_deviation_inches NUMERIC(5,2),
  entry_angle NUMERIC(5,2),
  peak_height_inches NUMERIC(6,2),
  release_time_ms INTEGER,
  ball_rotation_rpm NUMERIC(6,2),
  consistency_score NUMERIC(4,2),
  analysis_confidence NUMERIC(3,2) DEFAULT 95.0,
  computer_vision_data JSONB DEFAULT '{}'::jsonb,
  audio_feedback TEXT,
  recommendations JSONB DEFAULT '[]'::jsonb,
  processed_by TEXT DEFAULT 'ai_vision_system',
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_translations table for real translation data
CREATE TABLE public.message_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  original_content TEXT NOT NULL,
  translated_content TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'auto-detect',
  target_language TEXT NOT NULL,
  translation_service TEXT NOT NULL DEFAULT 'google_translate',
  confidence_score NUMERIC(3,2),
  translation_quality TEXT CHECK (translation_quality IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.partner_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_communications
CREATE POLICY "Partners and staff can view communications" 
ON public.partner_communications 
FOR SELECT 
USING (
  has_role(auth.uid(), 'partner'::user_role) OR 
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

CREATE POLICY "Authorized users can manage communications" 
ON public.partner_communications 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid()) OR
  sender_id = auth.uid()
);

-- RLS Policies for shot_analysis
CREATE POLICY "Players can view their own shot analysis" 
ON public.shot_analysis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM shots s 
    JOIN players p ON s.player_id = p.id 
    WHERE s.id = shot_analysis.shot_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage shot analysis" 
ON public.shot_analysis 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- RLS Policies for message_translations
CREATE POLICY "Users can view translations in their chats" 
ON public.message_translations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_messages cm
    JOIN chat_participants cp ON cm.chat_id = cp.chat_id
    WHERE cm.id = message_translations.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage translations" 
ON public.message_translations 
FOR ALL 
USING (true);

-- Add foreign key constraints
ALTER TABLE public.shot_analysis 
ADD CONSTRAINT fk_shot_analysis_shot_id 
FOREIGN KEY (shot_id) REFERENCES public.shots(id) ON DELETE CASCADE;

ALTER TABLE public.message_translations 
ADD CONSTRAINT fk_message_translations_message_id 
FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_partner_communications_sender ON public.partner_communications(sender_id);
CREATE INDEX idx_partner_communications_type ON public.partner_communications(communication_type);
CREATE INDEX idx_partner_communications_status ON public.partner_communications(status);
CREATE INDEX idx_shot_analysis_shot_id ON public.shot_analysis(shot_id);
CREATE INDEX idx_message_translations_message_id ON public.message_translations(message_id);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_partner_communications_updated_at
BEFORE UPDATE ON public.partner_communications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shot_analysis_updated_at
BEFORE UPDATE ON public.shot_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();