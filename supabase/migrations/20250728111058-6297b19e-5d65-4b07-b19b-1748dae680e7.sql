-- Add recurring event fields to schedules table
ALTER TABLE public.schedules 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_pattern text, -- 'daily', 'weekly', 'monthly'
ADD COLUMN recurrence_interval integer DEFAULT 1, -- every X days/weeks/months
ADD COLUMN recurrence_end_date date;