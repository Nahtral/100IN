import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { OptimisticMessage } from './useOptimisticMessages';

interface UseChatOptimizationsProps {
  chatId: string;
  onMessagesUpdate: (messages: OptimisticMessage[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatOptimizations = ({ 
  chatId, 
  onMessagesUpdate, 
  setLoading 
}: UseChatOptimizationsProps) => {
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const messageCache = useRef<Map<string, OptimisticMessage>>(new Map());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesPerPage = 50;

  // Fetch messages with pagination
  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!append) setLoading(true);
    setLoadingMore(append);

    try {
      const offset = (pageNum - 1) * messagesPerPage;
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_reactions!fk_message_reactions_message_id(
            emoji,
            user_id
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + messagesPerPage - 1);

      if (error) throw error;

      if (messages && messages.length > 0) {
        // Get sender profiles
        const senderIds = [...new Set(messages.map(msg => msg.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);

        // Attach sender info and reverse for chronological order
        const messagesWithProfiles = messages
          .map(message => ({
            ...message,
            content: message.content || '',
            is_edited: message.is_edited || false,
            is_recalled: message.is_recalled || false,
            is_archived: message.is_archived || false,
            edit_history: Array.isArray(message.edit_history) ? message.edit_history : [],
            sender: profiles?.find(p => p.id === message.sender_id)
          }))
          .reverse() as OptimisticMessage[];

        // Update cache
        messagesWithProfiles.forEach(msg => {
          messageCache.current.set(msg.id, msg);
        });

        if (append) {
          // Append older messages
          const existingMessages = Array.from(messageCache.current.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          onMessagesUpdate(existingMessages);
        } else {
          onMessagesUpdate(messagesWithProfiles);
        }

        setHasMore(messages.length === messagesPerPage);
      } else {
        if (!append) onMessagesUpdate([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [chatId, onMessagesUpdate, setLoading, toast]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchMessages(nextPage, true);
  }, [page, hasMore, loadingMore, fetchMessages]);

  // Optimized real-time subscription
  const subscribeToMessages = useCallback(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat-${chatId}-optimized`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender profile for new message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', newMessage.sender_id)
            .single();

          const messageWithProfile: OptimisticMessage = {
            ...newMessage,
            content: newMessage.content || '',
            is_edited: newMessage.is_edited || false,
            is_recalled: newMessage.is_recalled || false,
            is_archived: newMessage.is_archived || false,
            edit_history: Array.isArray(newMessage.edit_history) ? newMessage.edit_history : [],
            sender: senderProfile,
            message_reactions: []
          };

          // Add to cache and update messages
          messageCache.current.set(newMessage.id, messageWithProfile);
          
          const allMessages = Array.from(messageCache.current.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          onMessagesUpdate(allMessages);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          const updatedMessage = payload.new as any;
          
          // Update cache
          const existingMessage = messageCache.current.get(updatedMessage.id);
          if (existingMessage) {
            const updatedWithProfile: OptimisticMessage = {
              ...updatedMessage,
              content: updatedMessage.content || '',
              is_edited: updatedMessage.is_edited || false,
              is_recalled: updatedMessage.is_recalled || false,
              is_archived: updatedMessage.is_archived || false,
              edit_history: Array.isArray(updatedMessage.edit_history) ? updatedMessage.edit_history : [],
              sender: existingMessage.sender,
              message_reactions: existingMessage.message_reactions || []
            };
            
            messageCache.current.set(updatedMessage.id, updatedWithProfile);
            
            const allMessages = Array.from(messageCache.current.values())
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            onMessagesUpdate(allMessages);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const deletedMessage = payload.old as any;
          
          // Remove from cache
          messageCache.current.delete(deletedMessage.id);
          
          const allMessages = Array.from(messageCache.current.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          onMessagesUpdate(allMessages);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, onMessagesUpdate]);

  // Initialize
  useEffect(() => {
    if (chatId) {
      // Reset state for new chat
      messageCache.current.clear();
      setPage(1);
      setHasMore(true);
      
      fetchMessages(1, false);
      const unsubscribe = subscribeToMessages();
      
      return unsubscribe;
    }
  }, [chatId, fetchMessages, subscribeToMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    loadMoreMessages,
    hasMore,
    loadingMore,
    refreshMessages: () => fetchMessages(1, false),
  };
};