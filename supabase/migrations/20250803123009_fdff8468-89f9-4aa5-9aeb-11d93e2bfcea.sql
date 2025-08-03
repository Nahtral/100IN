-- Create error_logs table for tracking application errors
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT NOT NULL,
  user_agent TEXT,
  user_id UUID,
  user_role TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance_logs table for tracking performance metrics
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  url TEXT NOT NULL,
  user_id UUID,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for error_logs (super admin only)
CREATE POLICY "Super admins can view all error logs" 
ON public.error_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() 
  AND ur.role = 'super_admin' 
  AND ur.is_active = true
));

CREATE POLICY "System can insert error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (true);

-- Create policies for performance_logs (super admin only)
CREATE POLICY "Super admins can view all performance logs" 
ON public.performance_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() 
  AND ur.role = 'super_admin' 
  AND ur.is_active = true
));

CREATE POLICY "System can insert performance logs" 
ON public.performance_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_performance_logs_created_at ON public.performance_logs(created_at DESC);
CREATE INDEX idx_performance_logs_metric ON public.performance_logs(metric);
CREATE INDEX idx_performance_logs_user_id ON public.performance_logs(user_id);