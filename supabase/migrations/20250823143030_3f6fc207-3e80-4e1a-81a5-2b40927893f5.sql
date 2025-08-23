-- Fix infinite recursion in chat_participants policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Chat admins and super admins can manage participants" ON chat_participants;

-- Create a new policy that doesn't cause recursion
-- Allow super admins to manage all participants
CREATE POLICY "Super admins can manage all chat participants"
ON chat_participants FOR ALL
USING (is_super_admin(auth.uid()));

-- Allow chat creators to manage participants (we'll need to track this in chats table)
CREATE POLICY "Chat creators can manage participants"
ON chat_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chats c 
    WHERE c.id = chat_participants.chat_id 
    AND c.created_by = auth.uid()
  )
);

-- Allow users to add themselves to chats (for joining)
CREATE POLICY "Users can add themselves to chats"
ON chat_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to remove themselves from chats
CREATE POLICY "Users can remove themselves from chats"
ON chat_participants FOR DELETE
USING (auth.uid() = user_id);