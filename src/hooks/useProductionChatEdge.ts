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
  error: { code: string; message: string } | null;
  hasMoreChats: boolean;
  hasMoreMessages: boolean;
  isOnline: boolean;
  
  // Actions
  selectChat: (chat: Chat | null) => void;
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
  
  // Message management
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  recallMessage: (messageId: string) => Promise<void>;
}

const CHATS_PER_PAGE = 20;
const MESSAGES_PER_PAGE = 50;

export function useProductionChatEdge(): UseProductionChatReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const chatsOffsetRef = useRef(0);
  const messagesOffsetRef = useRef(0);
  const retryTimeoutRef = useRef<number>();
  const subscriptionsRef = useRef<any[]>([]);
  const retryCountRef = useRef(0);

  // Call Edge Function helper with retry logic
  const callChatRelay = useCallback(async (action: string, params: any = {}, retryCount = 0) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token');
    }

    try {
      // Use Supabase client invoke
      const result = await supabase.functions.invoke('chat-relay', {
        body: { action, ...params }
      });

      if (result.error) {
        console.error('Edge Function error:', result.error);
        
        // Retry on 503 or network errors
        if ((result.error.message?.includes('503') || result.error.message?.includes('network')) && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return callChatRelay(action, params, retryCount + 1);
        }
        
        throw new Error(result.error.message || 'Edge function failed');
      }

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Unknown error from chat relay');
      }

      // Reset retry count on success
      retryCountRef.current = 0;
      return result.data.data;
      
    } catch (error: any) {
      console.error(`Chat relay error (attempt ${retryCount + 1}):`, error);
      
      // Retry on network errors or 503s
      if ((error.message?.includes('503') || error.message?.includes('network') || error.message?.includes('fetch')) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return callChatRelay(action, params, retryCount + 1);
      }
      
      throw error;
    }
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chats';
      setError({ 
        code: 'LOAD_CHATS_FAILED', 
        message: isOnline ? errorMessage : 'You appear to be offline. Please check your connection.' 
      });
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
      setError({ 
        code: 'LOAD_MESSAGES_FAILED', 
        message: isOnline ? errorMessage : 'You appear to be offline. Please check your connection.' 
      });
    } finally {
      setMessagesLoading(false);
    }
  }, [callChatRelay]);

  // Select chat and load its messages
  const selectChat = useCallback((chat: Chat | null) => {
    if (!chat || !chat.id) {
      setSelectedChat(null);
      setMessages([]);
      return;
    }
    
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
      setError({ code: 'CREATE_CHAT_FAILED', message });
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

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Generate unique client message ID for idempotency
    const clientMsgId = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      setError(null);
      
      // Optimistic UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-${clientMsgId}`,
        chat_id: selectedChat.id,
        sender_id: user.id,
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
        replyToId,
        clientMsgId
      });

      // Check if message was duplicate (already sent)
      if (newMessage.duplicate) {
        // Remove optimistic message and use existing one
        setMessages(prev => 
          prev.filter(msg => msg.id !== optimisticMessage.id)
        );
        toast.info('Message already sent');
        return;
      }

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
      
      // Mark optimistic message as failed with temp ID
      const tempId = `temp-${clientMsgId}`;
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId
            ? { ...msg, _failed: true, delivery_status: 'failed' as const }
            : msg
        )
      );
      
      const message = error instanceof Error ? error.message : 'Failed to send message';
      setError({ code: 'SEND_MESSAGE_FAILED', message });
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

  // Message management functions
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      setError(null);
      await callChatRelay('edit_message', { messageId, content: newContent });
      
      // Update local message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent, edited_at: new Date().toISOString(), is_edited: true }
            : msg
        )
      );
      
      toast.success('Message edited successfully');
    } catch (error) {
      console.error('Error editing message:', error);
      const message = error instanceof Error ? error.message : 'Failed to edit message';
      setError({ code: 'EDIT_MESSAGE_FAILED', message });
      toast.error(message);
    }
  }, [callChatRelay]);

  const recallMessage = useCallback(async (messageId: string) => {
    try {
      setError(null);
      await callChatRelay('recall_message', { messageId });
      
      // Update local message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'recalled' as const, content: '[Message recalled]', is_deleted: true }
            : msg
        )
      );
      
      toast.success('Message recalled successfully');
    } catch (error) {
      console.error('Error recalling message:', error);
      const message = error instanceof Error ? error.message : 'Failed to recall message';
      setError({ code: 'RECALL_MESSAGE_FAILED', message });
      toast.error(message);
    }
  }, [callChatRelay]);

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
                setMessages(prev => {
                  // Check if message already exists (avoid duplicates)
                  const exists = prev.some(msg => msg.id === newMessage.id);
                  if (exists) return prev;
                  
                  return [...prev, {
                    ...newMessage,
                    sender_name: 'Unknown', // Will be updated by refresh
                    sender_email: '',
                    is_edited: !!newMessage.edited_at,
                    is_deleted: newMessage.status === 'recalled',
                    reactions: []
                  }];
                });
              }
              
              // Refresh chats to update last message
              refreshChats();
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
            (payload) => {
              console.log('Message updated:', payload);
              
              // Update message in current chat
              if (selectedChat && payload.new.chat_id === selectedChat.id) {
                const updatedMessage = payload.new as any;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === updatedMessage.id 
                      ? {
                          ...msg,
                          ...updatedMessage,
                          is_edited: !!updatedMessage.edited_at,
                          is_deleted: updatedMessage.status === 'recalled',
                          version: updatedMessage.version
                        }
                      : msg
                  )
                );
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'chat_messages' },
            (payload) => {
              console.log('Message deleted:', payload);
              
              // Remove message from current chat
              if (selectedChat && payload.old.chat_id === selectedChat.id) {
                setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
              }
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

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Warm-up ping on app start to reduce 503s
  useEffect(() => {
    const warmUpEdgeFunction = async () => {
      try {
        await callChatRelay('list_chats', { limit: 1, offset: 0 });
      } catch (error) {
        console.log('Warm-up ping failed (expected):', error);
      }
    };
    
    // Ping after a short delay to let auth settle
    const timer = setTimeout(warmUpEdgeFunction, 1000);
    return () => clearTimeout(timer);
  }, [callChatRelay]);

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
    isOnline,
    
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
    
    // Message management
    editMessage,
    recallMessage,
  };
}