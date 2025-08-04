-- Create shot tracking tables for ShotIQ system

-- Shot sessions table
CREATE TABLE public.shot_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    super_admin_id UUID NOT NULL,
    session_name TEXT NOT NULL DEFAULT 'Training Session',
    location TEXT DEFAULT 'Court',
    rim_height_inches NUMERIC DEFAULT 120, -- 10 feet = 120 inches
    total_shots INTEGER DEFAULT 0,
    makes INTEGER DEFAULT 0,
    avg_arc_degrees NUMERIC,
    avg_depth_inches NUMERIC,
    avg_lr_deviation_inches NUMERIC,
    session_duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual shots table
CREATE TABLE public.shots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.shot_sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    shot_number INTEGER NOT NULL,
    arc_degrees NUMERIC,
    depth_inches NUMERIC, -- distance from front of rim
    lr_deviation_inches NUMERIC, -- left/right deviation (positive = right, negative = left)
    shot_type TEXT DEFAULT 'catch-and-shoot', -- 'free-throw', 'catch-and-shoot', 'off-the-dribble', 'pull-up', 'fadeaway'
    court_x_position NUMERIC, -- court position x coordinate
    court_y_position NUMERIC, -- court position y coordinate
    made BOOLEAN NOT NULL DEFAULT false,
    video_url TEXT, -- storage URL for 3-5 second clip
    video_filename TEXT,
    audio_feedback TEXT, -- the audio feedback given
    ai_analysis_data JSONB, -- raw AI analysis data
    timestamp_in_session INTEGER, -- seconds since session start
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shot analytics summaries for quick lookups
CREATE TABLE public.shot_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.shot_sessions(id) ON DELETE CASCADE,
    shot_type TEXT NOT NULL,
    court_zone TEXT NOT NULL, -- 'free-throw', 'close', 'mid-range', 'three-point'
    total_attempts INTEGER DEFAULT 0,
    makes INTEGER DEFAULT 0,
    make_percentage NUMERIC DEFAULT 0,
    avg_arc_degrees NUMERIC,
    avg_depth_inches NUMERIC,
    consistency_score NUMERIC, -- calculated variance score
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(player_id, session_id, shot_type, court_zone)
);

-- ShotIQ messages for drill assignments and feedback
CREATE TABLE public.shotiq_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    super_admin_id UUID NOT NULL,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'feedback', -- 'feedback', 'drill-assignment', 'session-note'
    subject TEXT,
    content TEXT NOT NULL,
    session_id UUID REFERENCES public.shot_sessions(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shotiq_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shot_sessions
CREATE POLICY "Super admins can manage all shot sessions" 
ON public.shot_sessions 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Players can view their own shot sessions" 
ON public.shot_sessions 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = shot_sessions.player_id 
    AND p.user_id = auth.uid()
));

-- RLS Policies for shots
CREATE POLICY "Super admins can manage all shots" 
ON public.shots 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Players can view their own shots" 
ON public.shots 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = shots.player_id 
    AND p.user_id = auth.uid()
));

-- RLS Policies for shot_analytics
CREATE POLICY "Super admins can manage all shot analytics" 
ON public.shot_analytics 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Players can view their own shot analytics" 
ON public.shot_analytics 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = shot_analytics.player_id 
    AND p.user_id = auth.uid()
));

-- RLS Policies for shotiq_messages
CREATE POLICY "Super admins can manage all ShotIQ messages" 
ON public.shotiq_messages 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Players can view messages sent to them" 
ON public.shotiq_messages 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.players p 
    WHERE p.id = shotiq_messages.player_id 
    AND p.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_shot_sessions_player_id ON public.shot_sessions(player_id);
CREATE INDEX idx_shot_sessions_super_admin_id ON public.shot_sessions(super_admin_id);
CREATE INDEX idx_shots_session_id ON public.shots(session_id);
CREATE INDEX idx_shots_player_id ON public.shots(player_id);
CREATE INDEX idx_shots_shot_type ON public.shots(shot_type);
CREATE INDEX idx_shot_analytics_player_id ON public.shot_analytics(player_id);
CREATE INDEX idx_shotiq_messages_player_id ON public.shotiq_messages(player_id);

-- Create updated_at triggers
CREATE TRIGGER update_shot_sessions_updated_at
    BEFORE UPDATE ON public.shot_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shot_analytics_updated_at
    BEFORE UPDATE ON public.shot_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();