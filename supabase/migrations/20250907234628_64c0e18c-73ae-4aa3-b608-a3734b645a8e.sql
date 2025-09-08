-- Create employee_emergency_contacts table
CREATE TABLE IF NOT EXISTS public.employee_emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency contacts
CREATE POLICY "HR staff can manage emergency contacts" 
ON public.employee_emergency_contacts 
FOR ALL 
USING (
  is_super_admin(auth.uid()) OR 
  (has_role(auth.uid(), 'staff'::user_role) AND user_has_permission(auth.uid(), 'manage_employees'))
);

CREATE POLICY "Employees can view their own emergency contacts" 
ON public.employee_emergency_contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_emergency_contacts.employee_id 
    AND e.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_emergency_contacts_updated_at
  BEFORE UPDATE ON public.employee_emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();