-- First, populate profiles with existing user data if the table exists but is empty
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Fix the foreign key constraints - reference profiles.id instead of profiles.user_id
ALTER TABLE public.chat_participants 
DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;

ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_participants 
DROP CONSTRAINT IF EXISTS chat_participants_chat_id_fkey;

ALTER TABLE public.chat_participants 
ADD CONSTRAINT chat_participants_chat_id_fkey 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

-- Fix messages foreign key constraints
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_chat_id_fkey 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_reply_to_message_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_reply_to_message_id_fkey 
FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

-- Fix message_reactions foreign key constraints
ALTER TABLE public.message_reactions 
DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;

ALTER TABLE public.message_reactions 
ADD CONSTRAINT fk_message_reactions_message_id 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_reactions 
DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;

ALTER TABLE public.message_reactions 
ADD CONSTRAINT message_reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable realtime for chat tables
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  -- Add to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;