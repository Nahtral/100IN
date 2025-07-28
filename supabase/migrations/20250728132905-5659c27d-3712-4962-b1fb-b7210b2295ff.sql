-- Create payments table for revenue tracking
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_type TEXT NOT NULL, -- 'registration', 'membership', 'merchandise', etc.
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payer_id UUID REFERENCES public.profiles(id),
  team_id UUID,
  description TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create system_alerts table for tracking system notifications
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'error', 'warning', 'info', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1, -- 1-5 scale
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Super admins can manage all payments"
ON public.payments
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = payer_id);

-- RLS Policies for system_alerts
CREATE POLICY "Super admins can manage all alerts"
ON public.system_alerts
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Staff can view alerts"
ON public.system_alerts
FOR SELECT
USING (has_role(auth.uid(), 'staff'::user_role) OR is_super_admin(auth.uid()));

-- Create update trigger for timestamps
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at
BEFORE UPDATE ON public.system_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.payments (amount, payment_type, payment_status, description, payment_date) VALUES
(150.00, 'registration', 'completed', 'Team registration fee', NOW() - INTERVAL '1 day'),
(75.00, 'membership', 'completed', 'Monthly membership', NOW() - INTERVAL '2 days'),
(200.00, 'registration', 'completed', 'Tournament entry fee', NOW() - INTERVAL '3 days'),
(50.00, 'merchandise', 'completed', 'Team jersey', NOW() - INTERVAL '5 days'),
(125.00, 'membership', 'completed', 'Quarterly membership', NOW() - INTERVAL '1 week');

INSERT INTO public.system_alerts (alert_type, title, message, severity, is_resolved) VALUES
('warning', 'Low Storage Space', 'System storage is at 85% capacity', 2, FALSE),
('error', 'Payment Gateway Issue', 'Payment processing experiencing delays', 3, FALSE),
('info', 'Scheduled Maintenance', 'System maintenance scheduled for this weekend', 1, TRUE),
('critical', 'Database Connection', 'Temporary database connection issues detected', 4, FALSE);