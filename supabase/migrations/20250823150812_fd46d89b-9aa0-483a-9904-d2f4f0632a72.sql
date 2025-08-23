-- Fix security warnings: Set search_path for functions to prevent potential security issues

-- Update the user_created_chat function to set search_path
CREATE OR REPLACE FUNCTION public.user_created_chat(chat_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = chat_id AND created_by = user_id
  );
$$;

-- Also fix the is_super_admin function if it doesn't have search_path set
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'super_admin')
$function$;