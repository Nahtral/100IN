-- Create teamgrid_settings table
CREATE TABLE public.teamgrid_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_view TEXT NOT NULL DEFAULT 'grid',
  visible_columns TEXT[] NOT NULL DEFAULT ARRAY['name', 'team', 'role', 'status', 'age', 'contact'],
  sort_by TEXT NOT NULL DEFAULT 'name',
  sort_direction TEXT NOT NULL DEFAULT 'asc',
  page_size INTEGER NOT NULL DEFAULT 25 CHECK (page_size >= 10 AND page_size <= 200),
  allow_manual_players BOOLEAN NOT NULL DEFAULT true,
  allow_bulk_import BOOLEAN NOT NULL DEFAULT true,
  enable_archived_filter BOOLEAN NOT NULL DEFAULT false,
  accent_color TEXT NOT NULL DEFAULT '#0066cc',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teamgrid_settings table
ALTER TABLE public.teamgrid_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teamgrid_settings (super admin only)
CREATE POLICY "Super admins can view teamgrid settings"
ON public.teamgrid_settings
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage teamgrid settings"
ON public.teamgrid_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- Insert default settings row
INSERT INTO public.teamgrid_settings (
  default_view,
  visible_columns,
  sort_by,
  sort_direction,
  page_size,
  allow_manual_players,
  allow_bulk_import,
  enable_archived_filter,
  accent_color
) VALUES (
  'grid',
  ARRAY['name', 'team', 'role', 'status', 'age', 'contact', 'attendance'],
  'name',
  'asc',
  25,
  true,
  true,
  false,
  '#0066cc'
);

-- Add trigger for updated_at
CREATE TRIGGER update_teamgrid_settings_updated_at
BEFORE UPDATE ON public.teamgrid_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();