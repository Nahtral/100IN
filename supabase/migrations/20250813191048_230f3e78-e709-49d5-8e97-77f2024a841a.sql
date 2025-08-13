-- Secure permissions table - currently publicly readable
DROP POLICY IF EXISTS "All authenticated users can view permissions" ON public.permissions;

CREATE POLICY "Super admins can manage permissions" 
ON public.permissions 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff with manage_permissions can view permissions" 
ON public.permissions 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND 
   user_has_permission(auth.uid(), 'manage_permissions'))
);

-- Secure role_permissions table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    EXECUTE 'ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Super admins can manage role permissions" 
             ON public.role_permissions 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;

-- Secure role_templates table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_templates') THEN
    EXECUTE 'ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Super admins can manage role templates" 
             ON public.role_templates 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;

-- Secure template_permissions table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'template_permissions') THEN
    EXECUTE 'ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Super admins can manage template permissions" 
             ON public.template_permissions 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;

-- Create manage_permissions permission
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_permissions', 'Can view and modify system permissions', 'system')
ON CONFLICT (name) DO NOTHING;