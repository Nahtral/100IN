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
      case 'edit_message':
        result = await editMessage(user.id, params);
        break;
      case 'recall_message':
        result = await recallMessage(user.id, params);
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
    
    // Add computed fields
    chat.member_count = participantCount || 0;
    chat.last_activity_at = chat.last_message_at;
    
    // Generate display_title using auto-naming logic
    chat.display_title = await generateChatDisplayTitle(chat, userId);
    
    // Determine if current user is admin
    const { data: userRole } = await supabaseAdmin
      .from('chat_participants')
      .select('role')
      .eq('chat_id', chat.id)
      .eq('user_id', userId)
      .single();
    
    chat.is_admin = userRole?.role === 'admin';
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

  // Get messages first
  const { data: messages, error } = await supabaseAdmin
    .from('chat_messages')
    .select(`
      id, chat_id, sender_id, content, message_type, attachment_url,
      attachment_name, attachment_size, reply_to_id, edited_at,
      created_at, status, language_code
    `)
    .eq('chat_id', chatId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get unique sender IDs and fetch their profiles
  const senderIds = [...new Set(messages.map(msg => msg.sender_id))];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', senderIds);

  // Create a map of sender ID to profile info
  const profileMap = new Map();
  (profiles || []).forEach(profile => {
    profileMap.set(profile.id, profile);
  });

  // Format messages for frontend
  return messages.map(msg => {
    const profile = profileMap.get(msg.sender_id);
    return {
      ...msg,
      sender_name: profile?.full_name || profile?.email || 'Unknown',
      sender_email: profile?.email || '',
      is_edited: !!msg.edited_at,
      is_deleted: msg.status === 'recalled',
      reactions: [] // TODO: Implement reactions if needed
    };
  }).reverse(); // Return in chronological order
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
      attachment_name, attachment_size, reply_to_id, created_at, status
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

  // Get sender profile info
  const { data: senderProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  // Format message for frontend
  return {
    ...message,
    sender_name: senderProfile?.full_name || senderProfile?.email || 'Unknown',
    sender_email: senderProfile?.email || '',
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

  // Get participants first
  const { data: participants, error } = await supabaseAdmin
    .from('chat_participants')
    .select('id, user_id, role, joined_at')
    .eq('chat_id', chatId);

  if (error) throw error;

  // Get profiles for all participants
  const userIds = participants.map(p => p.user_id);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  // Create profile map
  const profileMap = new Map();
  (profiles || []).forEach(profile => {
    profileMap.set(profile.id, profile);
  });

  return participants.map(p => {
    const profile = profileMap.get(p.user_id);
    return {
      ...p,
      user_name: profile?.full_name || profile?.email || 'Unknown',
      user_email: profile?.email || ''
    };
  });
}

// Helper function to generate display titles for chats
async function generateChatDisplayTitle(chat: any, currentUserId: string): Promise<string> {
  // If it's a team chat, get team name
  if (chat.chat_type === 'team' && chat.team_id) {
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', chat.team_id)
      .single();
    
    if (team?.name) {
      return `Team • ${team.name}`;
    }
  }

  // If it's a group chat with a custom name, use it
  if (chat.chat_type === 'group' && chat.name && chat.name !== 'Chat' && chat.name !== 'Group Chat') {
    return chat.name;
  }

  // For private/direct chats or unnamed groups, auto-generate name based on participants
  const { data: participants } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chat.id)
    .neq('user_id', currentUserId);

  if (!participants || participants.length === 0) {
    return chat.chat_type === 'group' ? 'Group Chat' : 'Direct Message';
  }

  // Get participant names
  const participantIds = participants.map(p => p.user_id);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .in('id', participantIds);

  const names = (profiles || []).map(p => p.full_name || p.email.split('@')[0]).filter(Boolean);

  if (names.length === 0) {
    return chat.chat_type === 'group' ? 'Group Chat' : 'Direct Message';
  }

  if (chat.chat_type === 'private' && names.length === 1) {
    return names[0]; // Direct message with one other person
  }

  // For groups or multiple participants
  if (names.length <= 3) {
    return names.join(', ');
  } else {
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }
}

async function editMessage(userId: string, { messageId, content }) {
  // Use existing RPC function
  const { error } = await supabaseAdmin.rpc('rpc_edit_or_recall_message', {
    p_message_id: messageId,
    p_new_content: content,
    p_recall: false
  });

  if (error) throw error;
  return { success: true };
}

async function recallMessage(userId: string, { messageId }) {
  // Use existing RPC function  
  const { error } = await supabaseAdmin.rpc('rpc_edit_or_recall_message', {
    p_message_id: messageId,
    p_recall: true
  });

  if (error) throw error;
  return { success: true };
}