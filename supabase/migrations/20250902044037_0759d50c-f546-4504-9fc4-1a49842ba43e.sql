-- Remove the overly permissive policy that allows all authenticated users to see all chats
DROP POLICY IF EXISTS "Authenticated users can view chats" ON public.chats;

-- Ensure the restrictive policy is the only one for SELECT operations
-- This policy already exists and correctly restricts users to only see chats they participate in:
-- "Approved users can view chats they participate in" 

-- Also fix the useChat query by updating it to properly join with chat_participants
-- But first, let's verify our policies are working correctly by testing with a query