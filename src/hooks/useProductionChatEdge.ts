import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Chat, ChatMessage, CreateChatData } from '@/types/chat';
import { toast } from 'sonner';

export interface UseProductionChatReturn {
  // State
  chats: Chat[];
  loading: boolean;
  selectedChat: Chat | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  error: string | null;
  hasMoreChats: boolean;
  hasMoreMessages: boolean;
  
  // Actions
  selectChat: (chat: Chat) => void;
  createChat: (data: CreateChatData) => Promise<void>;
  sendMessage: (content: string, attachmentUrl?: string, attachmentName?: string, attachmentSize?: number, replyToId?: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  loadMoreChats: () => Promise<void>;
  refreshChats: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  retry: () => Promise<void>;
  
  // Chat management
  renameChat: (chatId: string, newName: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

const CHATS_PER_PAGE = 20;
const MESSAGES_PER_PAGE = 50;

export function useProductionChatEdge(): UseProductionChatReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const chatsOffsetRef = useRef(0);
  const messagesOffsetRef = useRef(0);
  const retryTimeoutRef = useRef<number>();
  const subscriptionsRef = useRef<any[]>([]);

  // Call Edge Function helper
  const callChatRelay = useCallback(async (action: string, params: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(
      `https://oxwbeahwldxtwfezubdm.functions.supabase.co/chat-relay`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...params })
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    return result.data;
  }, []);

  // Load chats
  const loadChats = useCallback(async (reset = false) => {
    try {
      setError(null);
      if (reset) {
        setLoading(true);
        chatsOffsetRef.current = 0;
      }

      const data = await callChatRelay('list_chats', {
        limit: CHATS_PER_PAGE,
        offset: reset ? 0 : chatsOffsetRef.current
      });

      if (reset) {
        setChats(data);
      } else {
        setChats(prev => [...prev, ...data]);
      }

      setHasMoreChats(data.length === CHATS_PER_PAGE);
      chatsOffsetRef.current += data.length;

    } catch (error) {
      console.error('Error loading chats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [callChatRelay]);

  // Load messages for selected chat
  const loadMessages = useCallback(async (chatId: string, reset = false) => {
    try {
      setError(null);
      if (reset) {
        setMessagesLoading(true);
        messagesOffsetRef.current = 0;
      }

      const data = await callChatRelay('get_messages', {
        chatId,
        limit: MESSAGES_PER_PAGE,
        offset: reset ? 0 : messagesOffsetRef.current
      });

      if (reset) {
        setMessages(data);
      } else {
        setMessages(prev => [...data, ...prev]);
      }

      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
      messagesOffsetRef.current += data.length;

    } catch (error) {
      console.error('Error loading messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, [callChatRelay]);

  // Select chat and load its messages
  const selectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);
    loadMessages(chat.id, true);
    markAsRead(chat.id).catch(console.error);
  }, [loadMessages]);

  // Create new chat
  const createChat = useCallback(async (data: CreateChatData) => {
    try {
      setError(null);
      const newChat = await callChatRelay('create_chat', {
        name: data.name,
        type: data.type,
        participants: data.participants,
        teamId: data.team_id
      });
      
      // Add to chats list
      setChats(prev => [newChat, ...prev]);
      
      // Auto-select the new chat
      selectChat(newChat);
      
      toast.success('Chat created successfully');
    } catch (error) {
      console.error('Error creating chat:', error);
      const message = error instanceof Error ? error.message : 'Failed to create chat';
      setError(message);
      toast.error(message);
    }
  }, [callChatRelay, selectChat]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentSize?: number,
    replyToId?: string
  ) => {
    if (!selectedChat) return;

    try {
      setError(null);
      
      // Optimistic UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chat_id: selectedChat.id,
        sender_id: (await supabase.auth.getUser()).data.user?.id || '',
        content,
        message_type: 'text',
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_size: attachmentSize,
        reply_to_id: replyToId,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        sender_name: 'You',
        sender_email: '',
        reactions: [],
        status: 'visible',
        _optimistic: true,
        _pending: true,
        delivery_status: 'sending'
      };

      setMessages(prev => [...prev, optimisticMessage]);

      const newMessage = await callChatRelay('send_message', {
        chatId: selectedChat.id,
        content,
        messageType: 'text',
        attachmentUrl,
        attachmentName,
        attachmentSize,
        replyToId
      });

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...newMessage, delivery_status: 'sent' as const }
            : msg
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark optimistic message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._optimistic && msg._pending
            ? { ...msg, _failed: true, delivery_status: 'failed' as const }
            : msg
        )
      );
      
      const message = error instanceof Error ? error.message : 'Failed to send message';
      setError(message);
      toast.error(message);
    }
  }, [selectedChat, callChatRelay]);

  // Mark chat as read
  const markAsRead = useCallback(async (chatId: string) => {
    try {
      await callChatRelay('mark_read', { chatId });
      
      // Update local chat unread count
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [callChatRelay]);

  // Chat management functions
  const renameChat = useCallback(async (chatId: string, newName: string) => {
    try {
      const updatedChat = await callChatRelay('update_chat', {
        chatId,
        name: newName
      });
      
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, name: newName } : chat
        )
      );
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => prev ? { ...prev, name: newName } : null);
      }
      
      toast.success('Chat renamed successfully');
    } catch (error) {
      console.error('Error renaming chat:', error);
      const message = error instanceof Error ? error.message : 'Failed to rename chat';
      toast.error(message);
    }
  }, [callChatRelay, selectedChat]);

  const archiveChat = useCallback(async (chatId: string) => {
    try {
      await callChatRelay('update_chat', {
        chatId,
        status: 'archived'
      });
      
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      
      toast.success('Chat archived successfully');
    } catch (error) {
      console.error('Error archiving chat:', error);
      const message = error instanceof Error ? error.message : 'Failed to archive chat';
      toast.error(message);
    }
  }, [callChatRelay, selectedChat]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await callChatRelay('update_chat', {
        chatId,
        status: 'deleted'
      });
      
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete chat';
      toast.error(message);
    }
  }, [callChatRelay, selectedChat]);

  // Load more functions
  const loadMoreMessages = useCallback(async () => {
    if (!selectedChat || messagesLoading || !hasMoreMessages) return;
    await loadMessages(selectedChat.id, false);
  }, [selectedChat, messagesLoading, hasMoreMessages, loadMessages]);

  const loadMoreChats = useCallback(async () => {
    if (loading || !hasMoreChats) return;
    await loadChats(false);
  }, [loading, hasMoreChats, loadChats]);

  // Refresh functions
  const refreshChats = useCallback(() => loadChats(true), [loadChats]);
  const refreshMessages = useCallback(() => {
    if (selectedChat) {
      return loadMessages(selectedChat.id, true);
    }
    return Promise.resolve();
  }, [selectedChat, loadMessages]);

  // Retry function
  const retry = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    await refreshChats();
    if (selectedChat) {
      await refreshMessages();
    }
  }, [refreshChats, refreshMessages, selectedChat]);

  // Set up real-time subscriptions
  useEffect(() => {
    const setupRealtime = async () => {
      try {
        // Subscribe to chat changes
        const chatsChannel = supabase
          .channel('chats-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'chats' },
            (payload) => {
              console.log('Chat change:', payload);
              // Refresh chats on any chat change
              refreshChats();
            }
          )
          .subscribe();

        // Subscribe to message changes
        const messagesChannel = supabase
          .channel('messages-changes')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
              console.log('New message:', payload);
              
              // If it's for the current chat, add it to messages
              if (selectedChat && payload.new.chat_id === selectedChat.id) {
                const newMessage = payload.new as any;
                setMessages(prev => [...prev, {
                  ...newMessage,
                  sender_name: 'Unknown', // Will be updated by refresh
                  sender_email: '',
                  is_edited: false,
                  is_deleted: false,
                  reactions: []
                }]);
              }
              
              // Refresh chats to update last message
              refreshChats();
            }
          )
          .subscribe();

        subscriptionsRef.current = [chatsChannel, messagesChannel];

      } catch (error) {
        console.error('Error setting up realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [selectedChat, refreshChats]);

  // Initial load
  useEffect(() => {
    loadChats(true);
  }, [loadChats]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    chats,
    loading,
    selectedChat,
    messages,
    messagesLoading,
    error,
    hasMoreChats,
    hasMoreMessages,
    
    // Actions
    selectChat,
    createChat,
    sendMessage,
    markAsRead,
    loadMoreMessages,
    loadMoreChats,
    refreshChats,
    refreshMessages,
    retry,
    
    // Chat management
    renameChat,
    archiveChat,
    deleteChat,
  };
}