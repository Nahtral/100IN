-- Add missing fields to chats table for enhanced chat management
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_read_at timestamp with time zone;