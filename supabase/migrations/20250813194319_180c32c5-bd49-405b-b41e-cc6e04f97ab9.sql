-- Fix Critical Security Issue: Restrict system configuration data to super admins only

-- Drop overly permissive policies on role_permissions table
DROP POLICY IF EXISTS "All authenticated users can view role permissions" ON public.role_permissions;

-- Drop overly permissive policies on template_permissions table  
DROP POLICY IF EXISTS "All authenticated users can view template permissions" ON public.template_permissions;

-- Drop overly permissive policies on role_templates table
DROP POLICY IF EXISTS "All authenticated users can view role templates" ON public.role_templates;

-- Create secure policies for role_permissions (super admins only)
CREATE POLICY "Super admins can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Create secure policies for template_permissions (super admins only)
CREATE POLICY "Super admins can view template permissions" 
ON public.template_permissions 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage template permissions" 
ON public.template_permissions 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Create secure policies for role_templates (super admins only)
CREATE POLICY "Super admins can view role templates" 
ON public.role_templates 
FOR SELECT 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage role templates" 
ON public.role_templates 
FOR ALL 
USING (is_super_admin(auth.uid()));