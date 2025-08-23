-- Make user_id nullable for manual player entries
ALTER TABLE public.players ALTER COLUMN user_id DROP NOT NULL;

-- Add fields for manual player entries (when no user account exists)
ALTER TABLE public.players 
ADD COLUMN manual_entry_name text,
ADD COLUMN manual_entry_email text,
ADD COLUMN manual_entry_phone text;