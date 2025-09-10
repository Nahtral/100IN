-- Enable realtime for health tables
ALTER TABLE public.daily_health_checkins REPLICA IDENTITY FULL;
ALTER TABLE public.health_wellness REPLICA IDENTITY FULL;
ALTER TABLE public.medical_appointments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_health_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_wellness;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_appointments;