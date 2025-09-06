-- Clean up: Drop the insecure employees_v view completely
-- We've replaced it with the secure function get_employees_secure()
DROP VIEW IF EXISTS public.employees_v CASCADE;