-- Add foreign key constraints for chat system tables

-- Foreign keys for chats table
ALTER TABLE public.chats
ADD CONSTRAINT fk_chats_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chats
ADD CONSTRAINT fk_chats_archived_by 
FOREIGN KEY (archived_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Foreign keys for chat_participants table  
ALTER TABLE public.chat_participants
ADD CONSTRAINT fk_chat_participants_chat_id 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE public.chat_participants
ADD CONSTRAINT fk_chat_participants_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Foreign keys for messages table
ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_chat_id 
FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_sender_id 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
ADD CONSTRAINT fk_messages_recalled_by 
FOREIGN KEY (recalled_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Foreign keys for message_reactions table
ALTER TABLE public.message_reactions
ADD CONSTRAINT fk_message_reactions_message_id 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_reactions
ADD CONSTRAINT fk_message_reactions_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;