-- Add fields to support screenshot uploads and AI processing for game logs
ALTER TABLE game_logs 
ADD COLUMN screenshot_url TEXT,
ADD COLUMN ai_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN ai_confidence NUMERIC,
ADD COLUMN upload_method TEXT DEFAULT 'manual' CHECK (upload_method IN ('manual', 'screenshot', 'import')),
ADD COLUMN raw_ai_data JSONB;

-- Create a table for tracking AI processing jobs
CREATE TABLE game_log_ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_log_id UUID REFERENCES game_logs(id) ON DELETE CASCADE,
    screenshot_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    ai_response JSONB,
    error_message TEXT,
    confidence_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on the new table
ALTER TABLE game_log_ai_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for AI jobs table
CREATE POLICY "Staff and super admins can manage AI jobs"
ON game_log_ai_jobs FOR ALL
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff can view AI jobs"
ON game_log_ai_jobs FOR SELECT
USING (has_role(auth.uid(), 'staff'::user_role) OR has_role(auth.uid(), 'coach'::user_role) OR is_super_admin(auth.uid()));