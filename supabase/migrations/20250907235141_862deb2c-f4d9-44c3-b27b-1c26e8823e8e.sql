-- Update payments table currency default from USD to JPY
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'JPY';

-- Update all existing payment records from USD to JPY
UPDATE public.payments SET currency = 'JPY' WHERE currency = 'USD';