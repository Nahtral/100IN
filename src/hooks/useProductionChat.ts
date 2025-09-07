import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Chat, ChatMessage, CreateChatData, ChatError } from '@/types/chat';

interface UseProductionChatReturn {
  chats: Chat[];
  loading: boolean;
  selectedChat: Chat | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  hasMore: boolean;
  error: ChatError | null;
  
  // Actions
  selectChat: (chatId: string) => void;
  createChat: (data: CreateChatData) => Promise<string | null>;
  sendMessage: (content: string, type?: string, attachmentUrl?: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  loadMoreChats: () => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  retry: (operation: string) => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useProductionChat = (): UseProductionChatReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  
  const chatsOffsetRef = useRef(0);
  const messagesBeforeCursorRef = useRef<string | null>(null);
  const subscriptionsRef = useRef<any[]>([]);
  const retryCountRef = useRef<Record<string, number>>({});

  // Error handler with detailed error messages
  const handleError = useCallback((err: any, operation: string) => {
    console.error(`Chat ${operation} error:`, err);
    
    const errorDetails: ChatError = {
      code: err.code || err.error?.code || 'UNKNOWN_ERROR',
      message: err.message || err.error?.message || `Failed to ${operation}`,
      details: err.details || err.error?.details
    };
    
    setError(errorDetails);
    
    toast({
      variant: "destructive",
      title: `Error: ${operation}`,
      description: `${errorDetails.code}: ${errorDetails.message}`
    });
    
    return errorDetails;
  }, [toast]);

  // Retry mechanism with exponential backoff
  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>, 
    operationName: string,
    maxRetries = MAX_RETRIES
  ): Promise<T> => {
    const retryKey = operationName;
    retryCountRef.current[retryKey] = retryCountRef.current[retryKey] || 0;
    
    try {
      const result = await operation();
      retryCountRef.current[retryKey] = 0; // Reset on success
      return result;
    } catch (err) {
      const retryCount = retryCountRef.current[retryKey];
      
      if (retryCount < maxRetries) {
        retryCountRef.current[retryKey] = retryCount + 1;
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        
        console.log(`Retrying ${operationName} (attempt ${retryCount + 1}/${maxRetries}) in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(operation, operationName, maxRetries);
      }
      
      throw err;
    }
  }, []);

  // Load chats with pagination (schema-safe)
  const loadChats = useCallback(async (isLoadMore = false) => {
    if (!user) return;
    
    try {
      if (!isLoadMore) {
        setLoading(true);
        chatsOffsetRef.current = 0;
      }
      
      const { data, error } = await withRetry(
        async () => {
          const result = await supabase.rpc('rpc_list_chats', {
            limit_n: 30,
            offset_n: chatsOffsetRef.current
          });
          return result;
        },
        'load_chats'
      );

      if (error) throw error;

      const newChats = (data || []).map((chat: any): Chat => ({
        id: chat.chat_id,
        name: chat.chat_title,
        chat_type: chat.chat_is_group ? 'group' : 'private',
        created_by: '',
        team_id: null,
        is_archived: false,
        is_pinned: false,
        last_message_at: chat.last_msg_at,
        created_at: '',
        updated_at: '',
        last_message_content: chat.last_msg,
        last_message_sender: '',
        unread_count: Number(chat.unread_count),
        participant_count: 0
      }));
      
      if (isLoadMore) {
        setChats(prev => [...prev, ...newChats]);
      } else {
        setChats(newChats);
      }
      
      chatsOffsetRef.current += newChats.length;
      setError(null);
      
    } catch (err) {
      handleError(err, 'load chats');
    } finally {
      setLoading(false);
    }
  }, [user, withRetry, handleError]);

  // Load messages with pagination (schema-safe)
  const loadMessages = useCallback(async (chatId: string, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setMessagesLoading(true);
        messagesBeforeCursorRef.current = null;
      }
      
      const { data, error } = await withRetry(
        async () => {
          const result = await supabase.rpc('rpc_get_messages', {
            chat: chatId,
            limit_n: 50,
            before: messagesBeforeCursorRef.current
          });
          return result;
        },
        'load_messages'
      );

      if (error) throw error;

      const newMessages = (data || []).map((msg: any): ChatMessage => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        content: msg.body,
        message_type: msg.message_type as 'text' | 'image' | 'file' | 'system',
        attachment_url: msg.attachment_url,
        is_edited: false,
        is_deleted: false,
        edited_at: msg.edited_at,
        created_at: msg.created_at,
        sender_name: msg.sender_name,
        sender_email: msg.sender_email,
        reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
        delivery_status: 'delivered'
      })).reverse(); // Messages come in DESC order, reverse for chronological
      
      if (isLoadMore) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      
      setHasMore(newMessages.length === 50);
      
      if (newMessages.length > 0) {
        messagesBeforeCursorRef.current = newMessages[0].created_at;
      }
      
      setError(null);
      
    } catch (err) {
      handleError(err, 'load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, [withRetry, handleError]);

  // Select chat
  const selectChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setSelectedChat(chat);
      loadMessages(chatId, false);
      
      // Mark as read when selecting
      markAsRead(chatId);
    }
  }, [chats, loadMessages]);

  // Create chat
  const createChat = useCallback(async (data: CreateChatData): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data: chatId, error } = await withRetry(
        async () => {
          const result = await supabase.rpc('rpc_create_chat', {
            p_title: data.type === 'group' ? data.name : null,
            p_is_group: data.type === 'group',
            p_participants: data.participants
          });
          return result;
        },
        'create_chat'
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Chat created successfully"
      });

      await loadChats(false);
      return chatId;
      
    } catch (err) {
      handleError(err, 'create chat');
      return null;
    }
  }, [user, withRetry, handleError, toast]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    type: string = 'text',
    attachmentUrl?: string
  ) => {
    if (!user || !selectedChat) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chat_id: selectedChat.id,
      sender_id: user.id,
      content,
      message_type: type as any,
      attachment_url: attachmentUrl,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender_name: user.email || 'You',
      sender_email: user.email || '',
      reactions: [],
      delivery_status: 'sending',
      _optimistic: true,
      _pending: true
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data: messageId, error } = await withRetry(
        async () => {
          const result = await supabase.rpc('rpc_send_message', {
            chat_id_param: selectedChat.id,
            content_param: content,
            message_type_param: type,
            attachment_url_param: attachmentUrl || null
          });
          return result;
        },
        'send_message'
      );

      if (error) throw error;

      // Replace optimistic message with success state
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { 
              ...msg, 
              id: messageId,
              delivery_status: 'sent',
              _pending: false,
              _optimistic: false
            }
          : msg
      ));

    } catch (err) {
      // Mark as failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { 
              ...msg, 
              delivery_status: 'failed',
              _failed: true,
              _pending: false
            }
          : msg
      ));
      
      handleError(err, 'send message');
    }
  }, [user, selectedChat, withRetry, handleError]);

  // Mark as read (schema-safe)
  const markAsRead = useCallback(async (chatId: string) => {
    try {
      const { error } = await supabase.rpc('rpc_mark_read', {
        chat: chatId
      });

      if (error) throw error;

      // Update unread count locally
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, unread_count: 0 } : chat
      ));

    } catch (err) {
      console.error('Error marking as read:', err);
      // Don't show toast for this, it's not critical
    }
  }, []);

  // Load more functions
  const loadMoreMessages = useCallback(() => {
    if (selectedChat && hasMore && !messagesLoading) {
      return loadMessages(selectedChat.id, true);
    }
    return Promise.resolve();
  }, [selectedChat, hasMore, messagesLoading, loadMessages]);

  const loadMoreChats = useCallback(() => {
    if (!loading) {
      return loadChats(true);
    }
    return Promise.resolve();
  }, [loading, loadChats]);

  // Refresh functions
  const refreshChats = useCallback(() => loadChats(false), [loadChats]);
  
  const refreshMessages = useCallback(() => {
    if (selectedChat) {
      return loadMessages(selectedChat.id, false);
    }
    return Promise.resolve();
  }, [selectedChat, loadMessages]);

  // Retry function
  const retry = useCallback(async (operation: string) => {
    setError(null);
    
    switch (operation) {
      case 'load_chats':
        return refreshChats();
      case 'load_messages':
        return refreshMessages();
      default:
        console.warn(`Unknown retry operation: ${operation}`);
    }
  }, [refreshChats, refreshMessages]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!user) return;

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    subscriptionsRef.current = [];

    // Subscribe to chat changes
    const chatsChannel = supabase
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          refreshChats();
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Only add if it's not from current user (to avoid duplicates with optimistic updates)
          if (newMessage.sender_id !== user.id && selectedChat?.id === newMessage.chat_id) {
            setMessages(prev => [...prev, {
              ...newMessage,
              sender_name: 'User', // Will be updated by next refresh
              sender_email: '',
              reactions: [],
              delivery_status: 'delivered'
            }]);
            
            // Play notification sound if window not focused
            if (!document.hasFocus()) {
              try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {}); // Ignore if audio fails
              } catch (e) {
                // Ignore audio errors
              }
            }
          }
        }
      )
      .subscribe();

    subscriptionsRef.current = [chatsChannel, messagesChannel];

    return () => {
      subscriptionsRef.current.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
      subscriptionsRef.current = [];
    };
  }, [user, selectedChat, refreshChats]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadChats(false);
    }
  }, [user, loadChats]);

  return {
    chats,
    loading,
    selectedChat,
    messages,
    messagesLoading,
    hasMore,
    error,
    selectChat,
    createChat,
    sendMessage,
    loadMoreMessages,
    loadMoreChats,
    markAsRead,
    refreshChats,
    refreshMessages,
    retry
  };
};