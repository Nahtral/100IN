-- Add partner organizations table for partner dashboard
CREATE TABLE IF NOT EXISTS public.partner_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  partnership_type TEXT NOT NULL DEFAULT 'sponsor',
  partnership_status TEXT NOT NULL DEFAULT 'active',
  contract_start_date DATE,
  contract_end_date DATE,
  partnership_value NUMERIC,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for partner organizations
ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies for partner organizations
CREATE POLICY "Super admins can manage all partner organizations" 
ON public.partner_organizations 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Partners can view their own organization" 
ON public.partner_organizations 
FOR SELECT 
USING (has_role(auth.uid(), 'partner'::user_role));

-- Add dashboard_preferences table for customizable dashboards
CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_preferences JSONB DEFAULT '[]'::jsonb,
  layout_preferences JSONB DEFAULT '{}'::jsonb,
  theme_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS for dashboard preferences
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for dashboard preferences
CREATE POLICY "Users can manage their own dashboard preferences" 
ON public.dashboard_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Add staff tasks table for staff dashboard
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  task_type TEXT NOT NULL DEFAULT 'general',
  related_entity_id UUID,
  related_entity_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for staff tasks
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for staff tasks
CREATE POLICY "Staff can view assigned tasks" 
ON public.staff_tasks 
FOR SELECT 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  has_role(auth.uid(), 'coach'::user_role) OR 
  is_super_admin(auth.uid()) OR
  auth.uid() = assigned_to
);

CREATE POLICY "Staff and super admins can manage tasks" 
ON public.staff_tasks 
FOR ALL 
USING (
  has_role(auth.uid(), 'staff'::user_role) OR 
  is_super_admin(auth.uid())
);

-- Add partner_user_relationships table to link users to partner organizations
CREATE TABLE IF NOT EXISTS public.partner_user_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_organization_id UUID NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  role_in_organization TEXT NOT NULL DEFAULT 'member',
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_organization_id)
);

-- Enable RLS for partner user relationships
ALTER TABLE public.partner_user_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies for partner user relationships
CREATE POLICY "Super admins can manage all partner relationships" 
ON public.partner_user_relationships 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Partners can view their own relationships" 
ON public.partner_user_relationships 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add analytics_events table for dashboard analytics
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for analytics events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics events
CREATE POLICY "Super admins can view all analytics" 
ON public.analytics_events 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can create their own analytics events" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at columns
CREATE TRIGGER update_partner_organizations_updated_at
  BEFORE UPDATE ON public.partner_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_preferences_updated_at
  BEFORE UPDATE ON public.dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_tasks_updated_at
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();