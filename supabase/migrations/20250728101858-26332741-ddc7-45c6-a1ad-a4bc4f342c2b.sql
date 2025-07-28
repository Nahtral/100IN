-- Fix missing RLS policies on parent_child_relationships table
CREATE POLICY "Users can view their own parent relationships" 
ON public.parent_child_relationships 
FOR SELECT 
USING (auth.uid() = parent_id);

CREATE POLICY "Users can view their child relationships" 
ON public.parent_child_relationships 
FOR SELECT 
USING (auth.uid() = child_id);

CREATE POLICY "Super admins can manage all relationships" 
ON public.parent_child_relationships 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('medical-files', 'medical-files', false);

-- Create storage policies for avatars (public)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for documents (private)
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for medical files (restricted)
CREATE POLICY "Medical team can view medical files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'medical-files' AND (has_role(auth.uid(), 'medical'::user_role) OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid())));

CREATE POLICY "Medical team can upload medical files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'medical-files' AND (has_role(auth.uid(), 'medical'::user_role) OR has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid())));

-- Fix function search path issues
ALTER FUNCTION public.has_role(_user_id uuid, _role user_role) SET search_path = '';
ALTER FUNCTION public.is_super_admin(_user_id uuid) SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';