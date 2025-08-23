-- Remove duplicate policies - keep only the authenticated one
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;

-- The "Authenticated users can view participants" policy is sufficient