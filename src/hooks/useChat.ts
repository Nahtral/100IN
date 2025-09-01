import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Chat, Message, ChatParticipant, MessageReaction } from '@/types/chat';

interface UseChatReturn {
  chats: Chat[];
  loading: boolean;
  selectedChat: Chat | null;
  messages: Message[];
  messagesLoading: boolean;
  hasMore: boolean;
  selectChat: (chatId: string) => void;
  createChat: (data: CreateChatData) => Promise<string | null>;
  sendMessage: (content: string, type?: string, mediaUrl?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (reactionId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshChats: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  updateChat: (chatId: string, updates: Partial<Chat>) => Promise<void>;
}

interface CreateChatData {
  name?: string;
  type: 'private' | 'group' | 'team';
  participants: string[];
  team_id?: string;
}

export const useChat = (): UseChatReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  const messagesCache = useRef<Map<string, Message[]>>(new Map());
  const subscriptionsRef = useRef<any[]>([]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants!chat_participants_chat_id_fkey (
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load chats"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch messages for a chat
  const fetchMessages = useCallback(async (chatId: string, offset = 0) => {
    try {
      setMessagesLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_reactions!message_reactions_message_id_fkey (
            id,
            emoji,
            user_id,
            created_at
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + 49);

      if (error) throw error;

      const processedMessages = data.map(msg => ({
        ...msg,
        reactions: (msg.message_reactions || []).map(reaction => ({
          ...reaction,
          message_id: msg.id
        })),
        delivery_status: 'sent' as const
      })).reverse(); // Reverse to show oldest first
      
      if (offset === 0) {
        setMessages(processedMessages);
        messagesCache.current.set(chatId, processedMessages);
      } else {
        const existing = messagesCache.current.get(chatId) || [];
        const combined = [...processedMessages, ...existing];
        setMessages(combined);
        messagesCache.current.set(chatId, combined);
      }
      
      setHasMore(data.length === 50);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages"
      });
    } finally {
      setMessagesLoading(false);
    }
  }, [toast]);

  // Select chat
  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setSelectedChat(chat);
      
      // Check cache first
      const cachedMessages = messagesCache.current.get(chatId);
      if (cachedMessages) {
        setMessages(cachedMessages);
      } else {
        fetchMessages(chatId, 0);
      }
    }
  }, [chats, fetchMessages]);

  // Create chat
  const createChat = useCallback(async (data: CreateChatData): Promise<string | null> => {
    if (!user) return null;

    try {
      const chatData = {
        name: data.name || `Chat ${Date.now()}`,
        chat_type: data.type,
        created_by: user.id,
        team_id: data.team_id
      };

      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert(chatData)
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants
      const participants = [
        { chat_id: newChat.id, user_id: user.id, role: 'admin' },
        ...data.participants.map(userId => ({
          chat_id: newChat.id,
          user_id: userId,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast({
        title: "Success",
        description: "Chat created successfully"
      });

      await refreshChats();
      return newChat.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create chat"
      });
      return null;
    }
  }, [user, toast]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    type: string = 'text',
    mediaUrl?: string
  ) => {
    if (!user || !selectedChat) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: selectedChat.id,
      sender_id: user.id,
      content,
      message_type: type,
      media_url: mediaUrl,
      is_edited: false,
      is_recalled: false,
      is_archived: false,
      created_at: new Date().toISOString(),
      delivery_status: 'sending',
      sender_profile: {
        id: user.id,
        full_name: user.email || 'User',
        email: user.email || ''
      },
      reactions: [],
      _optimistic: true,
      _pending: true
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: user.id,
          content,
          message_type: type,
          media_url: mediaUrl
        })
        .select(`
          *,
          message_reactions!message_reactions_message_id_fkey (
            id,
            emoji,
            user_id,
            created_at
          )
        `)
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...data, 
          reactions: (data.message_reactions || []).map(reaction => ({
            ...reaction,
            message_id: data.id
          })),
          delivery_status: 'sent' as const 
        } : msg
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark as failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, delivery_status: 'failed', _failed: true } : msg
      ));
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  }, [user, selectedChat, toast]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content, is_edited: true, edited_at: new Date().toISOString() }
          : msg
      ));

      toast({
        title: "Success",
        description: "Message edited successfully"
      });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to edit message"
      });
    }
  }, [toast]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      toast({
        title: "Success",
        description: "Message deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete message"
      });
    }
  }, [toast]);

  // Archive chat
  const archiveChat = useCallback(async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_archived: true })
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, is_archived: true } : chat
      ));

      toast({
        title: "Success",
        description: "Chat archived successfully"
      });
    } catch (error) {
      console.error('Error archiving chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to archive chat"
      });
    }
  }, [toast]);

  // Unarchive chat
  const unarchiveChat = useCallback(async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_archived: false })
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, is_archived: false } : chat
      ));

      toast({
        title: "Success",
        description: "Chat unarchived successfully"
      });
    } catch (error) {
      console.error('Error unarchiving chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unarchive chat"
      });
    }
  }, [toast]);

  // Delete chat permanently
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      // First delete all messages in the chat
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) throw messagesError;

      // Delete all participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId);

      if (participantsError) throw participantsError;

      // Finally delete the chat
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) throw chatError;

      // Update local state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // Clear selected chat if it was deleted
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
        messagesCache.current.delete(chatId);
      }

      toast({
        title: "Success",
        description: "Chat deleted permanently"
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete chat"
      });
    }
  }, [toast, selectedChat]);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) throw error;

      // Optimistically update UI
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                {
                  id: `temp_${Date.now()}`,
                  message_id: messageId,
                  user_id: user.id,
                  emoji,
                  created_at: new Date().toISOString()
                }
              ]
            }
          : msg
      ));
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add reaction"
      });
    }
  }, [user, toast]);

  // Remove reaction
  const removeReaction = useCallback(async (reactionId: string) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) throw error;

      // Optimistically update UI
      setMessages(prev => prev.map(msg => ({
        ...msg,
        reactions: (msg.reactions || []).filter(r => r.id !== reactionId)
      })));
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove reaction"
      });
    }
  }, [toast]);

  // Update chat
  const updateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', chatId);

      if (error) throw error;

      // Update local state
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      ));

      // Update selected chat if it's the one being updated
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, ...updates } : null);
      }

      // Refresh chats to get the latest data
      await fetchChats();
    } catch (error) {
      console.error('Error updating chat:', error);
      throw error;
    }
  }, [selectedChat, fetchChats]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!selectedChat || messagesLoading || !hasMore) return;
    
    const currentMessages = messagesCache.current.get(selectedChat.id) || [];
    await fetchMessages(selectedChat.id, currentMessages.length);
  }, [selectedChat, messagesLoading, hasMore, fetchMessages]);

  // Refresh functions
  const refreshChats = useCallback(async () => await fetchChats(), [fetchChats]);
  const refreshMessages = useCallback(async () => {
    if (selectedChat) {
      messagesCache.current.delete(selectedChat.id);
      await fetchMessages(selectedChat.id, 0);
    }
  }, [selectedChat, fetchMessages]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to chat changes
    const chatSubscription = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    // Subscribe to message changes
    const messageSubscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (selectedChat && (payload.new as any)?.chat_id === selectedChat.id) {
            refreshMessages();
          }
        }
      )
      .subscribe();

    subscriptionsRef.current = [chatSubscription, messageSubscription];

    return () => {
      subscriptionsRef.current.forEach(sub => {
        supabase.removeChannel(sub);
      });
    };
  }, [user, selectedChat, fetchChats, refreshMessages]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user, fetchChats]);

  return {
    chats,
    loading,
    selectedChat,
    messages,
    messagesLoading,
    hasMore,
    selectChat,
    createChat,
    sendMessage,
    editMessage,
    deleteMessage,
    archiveChat,
    unarchiveChat,
    deleteChat,
    addReaction,
    removeReaction,
    loadMoreMessages,
    refreshChats,
    refreshMessages,
    updateChat
  };
};