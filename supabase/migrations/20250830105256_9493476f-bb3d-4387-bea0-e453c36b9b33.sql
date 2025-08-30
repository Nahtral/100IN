-- Create user approval requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_role user_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  notes TEXT NULL,
  reason TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role change audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_role user_role NULL,
  new_role user_role NOT NULL,
  changed_by UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user account status table for archiving/deactivating users
CREATE TABLE IF NOT EXISTS public.user_account_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- active, archived, suspended, deleted
  status_changed_by UUID NOT NULL,
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  notes TEXT NULL,
  reactivation_date TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template permissions junction table
CREATE TABLE IF NOT EXISTS public.template_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, permission_id)
);

-- Enable RLS on new tables
ALTER TABLE public.user_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_approval_requests
CREATE POLICY "Super admins can manage approval requests"
ON public.user_approval_requests
FOR ALL 
TO authenticated
USING (is_super_admin(auth.uid()));

-- RLS policies for role_change_audit
CREATE POLICY "Super admins can view role audit"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert role audit"
ON public.role_change_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policies for user_account_status
CREATE POLICY "Super admins can manage account status"
ON public.user_account_status
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- RLS policies for template_permissions
CREATE POLICY "Super admins can manage template permissions"
ON public.template_permissions
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Create function to safely delete/archive users
CREATE OR REPLACE FUNCTION public.archive_user_account(
  target_user_id UUID,
  archive_reason TEXT,
  permanently_delete BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can archive users
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions to archive user account';
  END IF;

  -- Insert status change record
  INSERT INTO public.user_account_status (
    user_id,
    status,
    status_changed_by,
    reason
  ) VALUES (
    target_user_id,
    CASE WHEN permanently_delete THEN 'deleted' ELSE 'archived' END,
    auth.uid(),
    archive_reason
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    status = CASE WHEN permanently_delete THEN 'deleted' ELSE 'archived' END,
    status_changed_by = auth.uid(),
    status_changed_at = now(),
    reason = archive_reason,
    updated_at = now();

  -- Deactivate all user roles
  UPDATE public.user_roles 
  SET is_active = false 
  WHERE user_id = target_user_id;

  -- Deactivate all user permissions
  UPDATE public.user_permissions 
  SET is_active = false 
  WHERE user_id = target_user_id;

  -- If permanently deleting, also delete from profiles
  IF permanently_delete THEN
    DELETE FROM public.profiles WHERE id = target_user_id;
  END IF;

  RETURN true;
END;
$$;

-- Create function to reactivate users
CREATE OR REPLACE FUNCTION public.reactivate_user_account(
  target_user_id UUID,
  reactivation_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can reactivate users
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate user account';
  END IF;

  -- Update status to active
  UPDATE public.user_account_status 
  SET 
    status = 'active',
    status_changed_by = auth.uid(),
    status_changed_at = now(),
    reason = reactivation_reason,
    reactivation_date = now(),
    updated_at = now()
  WHERE user_id = target_user_id;

  RETURN true;
END;
$$;

-- Create triggers for audit logging
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log role changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_change_audit (
      user_id,
      new_role,
      changed_by,
      reason
    ) VALUES (
      NEW.user_id,
      NEW.role,
      auth.uid(),
      'Role assigned'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    INSERT INTO public.role_change_audit (
      user_id,
      old_role,
      changed_by,
      reason
    ) VALUES (
      NEW.user_id,
      NEW.role,
      auth.uid(),
      'Role revoked'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS log_role_changes_trigger ON public.user_roles;
CREATE TRIGGER log_role_changes_trigger
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_changes();