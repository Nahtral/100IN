import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    const { action, ...params } = await req.json();
    console.log(`Chat relay: ${action} for user ${user.id}`, params);

    let result;

    switch (action) {
      case 'list_chats':
        result = await listChats(user.id, params);
        break;
      case 'get_messages':
        result = await getMessages(user.id, params);
        break;
      case 'create_chat':
        result = await createChat(user.id, params);
        break;
      case 'send_message':
        result = await sendMessage(user.id, params);
        break;
      case 'update_chat':
        result = await updateChat(user.id, params);
        break;
      case 'mark_read':
        result = await markAsRead(user.id, params);
        break;
      case 'get_participants':
        result = await getParticipants(user.id, params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat relay error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: error.message.includes('Invalid token') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function listChats(userId: string, { limit = 30, offset = 0 }) {
  // Get chats where user is a participant
  const { data: participantChats, error: participantError } = await supabaseAdmin
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);

  if (participantError) throw participantError;

  const chatIds = participantChats.map(p => p.chat_id);
  if (chatIds.length === 0) return [];

  // Get chat details with last message info
  const { data: chats, error: chatsError } = await supabaseAdmin
    .from('chats')
    .select(`
      id, name, chat_type, created_by, team_id, is_archived, is_pinned,
      last_message_at, created_at, updated_at, status
    `)
    .in('id', chatIds)
    .order('last_message_at', { ascending: false, nullsLast: true })
    .range(offset, offset + limit - 1);

  if (chatsError) throw chatsError;

  // Get participant counts and unread counts
  for (const chat of chats) {
    // Get participant count
    const { count: participantCount } = await supabaseAdmin
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chat.id);

    // Get unread count
    const { data: participant } = await supabaseAdmin
      .from('chat_participants')
      .select('last_read_at')
      .eq('chat_id', chat.id)
      .eq('user_id', userId)
      .single();

    let unreadCount = 0;
    if (participant) {
      const { count } = await supabaseAdmin
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .eq('status', 'visible')
        .gte('created_at', participant.last_read_at || '1970-01-01');

      unreadCount = count || 0;
    }

    // Get last message content
    const { data: lastMessage } = await supabaseAdmin
      .from('chat_messages')
      .select('content, sender_id, created_at')
      .eq('chat_id', chat.id)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    chat.participant_count = participantCount || 0;
    chat.unread_count = unreadCount;
    chat.last_message_content = lastMessage?.content;
    chat.last_message_sender = lastMessage?.sender_id;
  }

  return chats;
}

async function getMessages(userId: string, { chatId, limit = 50, offset = 0 }) {
  // Verify user is participant
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('Access denied: not a participant in this chat');
  }

  // Get messages with sender info
  const { data: messages, error } = await supabaseAdmin
    .from('chat_messages')
    .select(`
      id, chat_id, sender_id, content, message_type, attachment_url,
      attachment_name, attachment_size, reply_to_id, edited_at,
      created_at, status, language_code,
      profiles:sender_id (full_name, email)
    `)
    .eq('chat_id', chatId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Format messages for frontend
  return messages.map(msg => ({
    ...msg,
    sender_name: msg.profiles?.full_name || msg.profiles?.email || 'Unknown',
    sender_email: msg.profiles?.email || '',
    is_edited: !!msg.edited_at,
    is_deleted: msg.status === 'recalled',
    reactions: [] // TODO: Implement reactions if needed
  })).reverse(); // Return in chronological order
}

async function createChat(userId: string, { name, type, participants = [], teamId = null }) {
  // Create chat
  const { data: chat, error: chatError } = await supabaseAdmin
    .from('chats')
    .insert({
      name,
      chat_type: type,
      created_by: userId,
      team_id: teamId,
      status: 'active'
    })
    .select()
    .single();

  if (chatError) throw chatError;

  // Add creator as admin participant
  const { error: creatorError } = await supabaseAdmin
    .from('chat_participants')
    .insert({
      chat_id: chat.id,
      user_id: userId,
      role: 'admin',
      joined_at: new Date().toISOString(),
      last_read_at: new Date().toISOString()
    });

  if (creatorError) throw creatorError;

  // Add other participants
  if (participants.length > 0) {
    const participantInserts = participants
      .filter(id => id !== userId)
      .map(id => ({
        chat_id: chat.id,
        user_id: id,
        role: 'member',
        joined_at: new Date().toISOString(),
        last_read_at: new Date().toISOString()
      }));

    if (participantInserts.length > 0) {
      const { error: participantError } = await supabaseAdmin
        .from('chat_participants')
        .insert(participantInserts);

      if (participantError) throw participantError;
    }
  }

  return chat;
}

async function sendMessage(userId: string, { chatId, content, messageType = 'text', attachmentUrl = null, attachmentName = null, attachmentSize = null, replyToId = null }) {
  // Verify user is participant
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('Access denied: not a participant in this chat');
  }

  // Insert message
  const { data: message, error } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      chat_id: chatId,
      sender_id: userId,
      content,
      message_type: messageType,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_size: attachmentSize,
      reply_to_id: replyToId,
      status: 'visible'
    })
    .select(`
      id, chat_id, sender_id, content, message_type, attachment_url,
      attachment_name, attachment_size, reply_to_id, created_at, status,
      profiles:sender_id (full_name, email)
    `)
    .single();

  if (error) throw error;

  // Update chat last_message_at
  await supabaseAdmin
    .from('chats')
    .update({ 
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', chatId);

  // Format message for frontend
  return {
    ...message,
    sender_name: message.profiles?.full_name || message.profiles?.email || 'Unknown',
    sender_email: message.profiles?.email || '',
    is_edited: false,
    is_deleted: false,
    reactions: []
  };
}

async function updateChat(userId: string, { chatId, name = null, status = null }) {
  // Verify user is participant (and admin for name changes)
  const { data: participant } = await supabaseAdmin
    .from('chat_participants')
    .select('role')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    throw new Error('Access denied: not a participant in this chat');
  }

  if (name && participant.role !== 'admin') {
    throw new Error('Only admins can change chat name');
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (name) updates.name = name;
  if (status) updates.status = status;

  const { data: chat, error } = await supabaseAdmin
    .from('chats')
    .update(updates)
    .eq('id', chatId)
    .select()
    .single();

  if (error) throw error;
  return chat;
}

async function markAsRead(userId: string, { chatId }) {
  // Update last_read_at for the participant
  const { error } = await supabaseAdmin
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
}

async function getParticipants(userId: string, { chatId }) {
  // Verify user is participant
  const { data: userParticipant } = await supabaseAdmin
    .from('chat_participants')
    .select('id')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .single();

  if (!userParticipant) {
    throw new Error('Access denied: not a participant in this chat');
  }

  // Get all participants with profile info
  const { data: participants, error } = await supabaseAdmin
    .from('chat_participants')
    .select(`
      id, user_id, role, joined_at,
      profiles:user_id (full_name, email)
    `)
    .eq('chat_id', chatId);

  if (error) throw error;

  return participants.map(p => ({
    ...p,
    user_name: p.profiles?.full_name || p.profiles?.email || 'Unknown',
    user_email: p.profiles?.email || ''
  }));
}