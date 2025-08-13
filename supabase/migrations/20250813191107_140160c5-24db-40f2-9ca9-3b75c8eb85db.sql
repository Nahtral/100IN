-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "All authenticated users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Super admins can manage all permissions" ON public.permissions;

-- Secure permissions table
CREATE POLICY "Super admins can manage permissions" 
ON public.permissions 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Check and secure role-related tables if they exist
DO $$ 
BEGIN
  -- Handle role_permissions table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    -- Drop existing policies first
    EXECUTE 'DROP POLICY IF EXISTS "Super admins can manage role permissions" ON public.role_permissions';
    EXECUTE 'ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "Super admins only can manage role permissions" 
             ON public.role_permissions 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;

  -- Handle role_templates table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_templates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admins can manage role templates" ON public.role_templates';
    EXECUTE 'ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "Super admins only can manage role templates" 
             ON public.role_templates 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;

  -- Handle template_permissions table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'template_permissions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admins can manage template permissions" ON public.template_permissions';
    EXECUTE 'ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "Super admins only can manage template permissions" 
             ON public.template_permissions 
             FOR ALL 
             USING (is_super_admin(auth.uid()))';
  END IF;
END $$;