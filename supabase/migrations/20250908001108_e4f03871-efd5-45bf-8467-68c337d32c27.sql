-- Create time_off_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  CONSTRAINT valid_request_type CHECK (request_type IN ('vacation', 'sick', 'personal', 'emergency', 'maternity', 'paternity'))
);

-- Enable RLS
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for time_off_requests
CREATE POLICY "Super admins can manage all time off requests" 
ON public.time_off_requests 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage time off requests" 
ON public.time_off_requests 
FOR ALL 
USING (has_role(auth.uid(), 'staff'::user_role));

CREATE POLICY "Coaches can view time off requests" 
ON public.time_off_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::user_role));

CREATE POLICY "Employees can view their own time off requests" 
ON public.time_off_requests 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = time_off_requests.employee_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Employees can create their own time off requests" 
ON public.time_off_requests 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = time_off_requests.employee_id 
  AND e.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_time_off_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_time_off_requests_updated_at
BEFORE UPDATE ON public.time_off_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_time_off_updated_at();