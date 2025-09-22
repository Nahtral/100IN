-- Exposure Portal Schema Implementation
-- Phase 1: Database Schema & Security Foundation

-- Create enum types for better data integrity
CREATE TYPE exposure_country AS ENUM ('USA', 'CAN');
CREATE TYPE education_level AS ENUM ('HS', 'University');
CREATE TYPE department_category AS ENUM ('Admissions', 'Athletics', 'Academics', 'FinancialAid', 'InternationalOffice', 'Other');
CREATE TYPE verification_status AS ENUM ('verified', 'stale', 'bounced', 'pending');
CREATE TYPE outreach_status AS ENUM ('queued', 'sent', 'bounced', 'opened', 'replied', 'failed');
CREATE TYPE template_audience AS ENUM ('Admissions', 'Athletics');

-- Institutions and Programs
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country exposure_country NOT NULL,
  level education_level NOT NULL,
  is_private BOOLEAN,
  state_province TEXT,
  city TEXT,
  website TEXT,
  boarding_available BOOLEAN DEFAULT false,
  conference TEXT,
  athletics_division TEXT,
  enrollment_size INTEGER,
  gpa_range JSONB, -- {min: 3.0, max: 4.0}
  sat_range JSONB, -- {min: 1200, max: 1600}
  international_admissions BOOLEAN DEFAULT false,
  data_source TEXT NOT NULL,
  source_ref TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Departments within institutions
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category department_category NOT NULL,
  sport TEXT,
  program_level TEXT,
  description TEXT,
  data_source TEXT NOT NULL,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact information for departments
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  office_location TEXT,
  is_primary BOOLEAN DEFAULT false,
  verification_status verification_status NOT NULL DEFAULT 'verified',
  data_source TEXT NOT NULL,
  last_verified_at TIMESTAMPTZ,
  last_contact_attempt TIMESTAMPTZ,
  bounce_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Outreach templates
CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  audience template_audience NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact lists for organization
CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items in contact lists
CREATE TABLE IF NOT EXISTS contact_list_items (
  list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID NOT NULL,
  PRIMARY KEY (list_id, contact_id)
);

-- Outreach sequences for automated campaigns
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL, -- [{dayOffset: 0, template_id: 'uuid', delay_hours: 0}]
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main outreach records
CREATE TABLE IF NOT EXISTS outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES outreach_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_via TEXT NOT NULL DEFAULT 'smtp',
  status outreach_status NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  last_status_at TIMESTAMPTZ DEFAULT NOW(),
  list_id UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_step INTEGER,
  scheduled_for TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within outreach
CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id UUID NOT NULL REFERENCES outreach(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  to_name TEXT,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  provider_message_id TEXT,
  status outreach_status NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players included in outreach
CREATE TABLE IF NOT EXISTS outreach_players (
  outreach_id UUID NOT NULL REFERENCES outreach(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  included_data JSONB DEFAULT '{}'::jsonb, -- Snapshot of player data at time of send
  PRIMARY KEY (outreach_id, player_id)
);

-- Data ingestion tracking
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  institutions_added INTEGER DEFAULT 0,
  institutions_updated INTEGER DEFAULT 0,
  contacts_added INTEGER DEFAULT 0,
  contacts_updated INTEGER DEFAULT 0,
  departments_added INTEGER DEFAULT 0,
  departments_updated INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  log_messages JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Connector configurations
CREATE TABLE IF NOT EXISTS data_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  requires_api_key BOOLEAN DEFAULT false,
  api_key_name TEXT, -- Reference to Supabase secret name
  schedule_cron TEXT, -- Cron expression for automated runs
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail for portal access
CREATE TABLE IF NOT EXISTS exposure_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- view_contact, send_outreach, run_connector, etc.
  resource_type TEXT NOT NULL, -- contact, institution, outreach, etc.
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_institutions_country_level ON institutions(country, level);
CREATE INDEX IF NOT EXISTS idx_institutions_data_source ON institutions(data_source);
CREATE INDEX IF NOT EXISTS idx_institutions_last_verified ON institutions(last_verified_at);
CREATE INDEX IF NOT EXISTS idx_departments_institution ON departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_category_sport ON departments(category, sport);
CREATE INDEX IF NOT EXISTS idx_contacts_institution ON contacts(institution_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_verification_status ON contacts(verification_status);
CREATE INDEX IF NOT EXISTS idx_outreach_created_by ON outreach(created_by);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach(status);
CREATE INDEX IF NOT EXISTS idx_outreach_scheduled_for ON outreach(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_outreach ON outreach_messages(outreach_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_connector ON ingestion_runs(connector);
CREATE INDEX IF NOT EXISTS idx_exposure_audit_log_user_action ON exposure_audit_log(user_id, action);

-- Enable Row Level Security on all tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE exposure_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Super Admin Only Access
CREATE POLICY "Super admins can manage institutions" ON institutions FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage departments" ON departments FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage contacts" ON contacts FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage templates" ON outreach_templates FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage contact lists" ON contact_lists FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage list items" ON contact_list_items FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage sequences" ON sequences FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage outreach" ON outreach FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage outreach messages" ON outreach_messages FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage outreach players" ON outreach_players FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage ingestion runs" ON ingestion_runs FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage data connectors" ON data_connectors FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view audit log" ON exposure_audit_log FOR SELECT USING (is_super_admin(auth.uid()));

-- Insert default outreach templates
INSERT INTO outreach_templates (name, audience, subject, body_html, variables, created_by) VALUES
('Admissions Introduction', 'Admissions', 'Student Inquiry - {{player.full_name}}', 
 '<p>Dear {{contact.first_name}},</p>
  <p>I hope this message finds you well. I am writing to introduce you to {{player.full_name}}, an exceptional student-athlete who has expressed strong interest in {{institution.name}}.</p>
  <p><strong>Academic Profile:</strong><br>
  GPA: {{player.gpa}}<br>
  SAT Score: {{player.sat_score}}<br>
  Graduation Year: {{player.graduation_year}}</p>
  <p><strong>Athletic Profile:</strong><br>
  Sport: {{player.sport}}<br>
  Position: {{player.position}}<br>
  Height: {{player.height}}<br>
  Weight: {{player.weight}}</p>
  <p>{{player.full_name}} is particularly drawn to {{institution.name}} because of its outstanding {{department.name}} program and commitment to academic excellence.</p>
  <p>I have attached their comprehensive profile for your review. Would you be available for a brief conversation to discuss {{player.full_name}}''s fit for your program?</p>
  <p>Thank you for your time and consideration.</p>
  <p>Best regards,<br>
  100IN Basketball Management</p>', 
 '["player.full_name", "player.gpa", "player.sat_score", "player.graduation_year", "player.sport", "player.position", "player.height", "player.weight", "contact.first_name", "institution.name", "department.name"]'::jsonb,
 (SELECT id FROM profiles WHERE approval_status = 'approved' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = 'super_admin' AND is_active = true) LIMIT 1)),

('Athletics Introduction', 'Athletics', 'Recruit Introduction - {{player.full_name}} - Class of {{player.graduation_year}}',
 '<p>Coach {{contact.first_name}},</p>
 <p>I hope you are having a great season. I wanted to introduce you to {{player.full_name}}, a talented {{player.position}} from {{player.high_school}} who would be an excellent addition to your {{sport}} program.</p>
 <p><strong>Player Highlights:</strong><br>
 Position: {{player.position}}<br>
 Height: {{player.height}}<br>
 Weight: {{player.weight}}<br>
 Graduation Year: {{player.graduation_year}}</p>
 <p><strong>Academic Stats:</strong><br>
 GPA: {{player.gpa}}<br>
 SAT/ACT: {{player.test_scores}}</p>
 <p>{{player.full_name}} has been following {{institution.name}} and is very interested in your program. They are impressed by your team''s success and the academic opportunities available.</p>
 <p>I have attached their highlight video and complete profile for your review. Would you be interested in learning more about {{player.full_name}}?</p>
 <p>Thank you for your time.</p>
 <p>Best regards,<br>
 100IN Basketball Management</p>',
 '["player.full_name", "player.position", "player.high_school", "player.height", "player.weight", "player.graduation_year", "player.gpa", "player.test_scores", "contact.first_name", "institution.name", "sport"]'::jsonb,
 (SELECT id FROM profiles WHERE approval_status = 'approved' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = 'super_admin' AND is_active = true) LIMIT 1));

-- Insert default data connectors (disabled by default)
INSERT INTO data_connectors (name, display_name, description, requires_api_key, api_key_name, schedule_cron) VALUES
('college_scorecard', 'College Scorecard (IPEDS)', 'US Department of Education College Scorecard API for higher education institutions', true, 'COLLEGE_SCORECARD_API_KEY', '0 2 * * 1'),
('ncaa_directory', 'NCAA Directory', 'NCAA athletics directory for college sports programs', true, 'NCAA_API_KEY', '0 3 * * 1'),
('naia_directory', 'NAIA Directory', 'NAIA athletics directory for college sports programs', true, 'NAIA_API_KEY', '0 4 * * 1'),
('universities_canada', 'Universities Canada', 'Official directory of Canadian universities', false, null, '0 5 * * 1'),
('nais_directory', 'NAIS Directory', 'National Association of Independent Schools directory', true, 'NAIS_API_KEY', '0 6 * * 2'),
('state_hs_athletics', 'State HS Athletics', 'State high school athletic association directories', true, 'STATE_HS_API_KEY', '0 7 * * 2');