-- Add new permissions for staff dashboard features
INSERT INTO public.permissions (name, description, category) 
VALUES 
  ('manage_registrations', 'Permission to view and manage user registrations', 'user_management'),
  ('view_communications', 'Permission to view communication center and messages', 'communications')
ON CONFLICT (name) DO NOTHING;