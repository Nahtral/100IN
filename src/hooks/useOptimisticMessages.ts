import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface OptimisticMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url?: string | null;
  media_type?: string | null;
  media_size?: number | null;
  created_at: string;
  is_edited: boolean | null;
  is_recalled: boolean | null;
  is_archived: boolean | null;
  edit_history?: any[] | null;
  message_reactions?: any[];
  sender?: {
    id: string;
    full_name: string;
  };
  // Optimistic states
  _optimistic?: boolean;
  _pending?: boolean;
  _failed?: boolean;
  _tempId?: string;
}

interface UseOptimisticMessagesProps {
  chatId: string;
  currentUserId?: string;
  onSendMessage: (
    content: string,
    messageType?: string,
    mediaUrl?: string,
    mediaType?: string,
    mediaSize?: number
  ) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

export const useOptimisticMessages = ({
  chatId,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
}: UseOptimisticMessagesProps) => {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const tempIdCounter = useRef(0);
  const { toast } = useToast();

  // Generate temporary ID for optimistic messages
  const generateTempId = () => `temp_${Date.now()}_${++tempIdCounter.current}`;

  // Add optimistic message immediately
  const addOptimisticMessage = useCallback((
    content: string,
    messageType: string = 'text',
    mediaUrl?: string,
    mediaType?: string,
    mediaSize?: number
  ) => {
    if (!currentUserId || !content.trim() && !mediaUrl) return null;

    const tempId = generateTempId();
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUserId,
      content: content.trim(),
      message_type: messageType,
      media_url: mediaUrl,
      media_type: mediaType,
      media_size: mediaSize,
      created_at: new Date().toISOString(),
      is_edited: false,
      is_recalled: false,
      is_archived: false,
      message_reactions: [],
      sender: {
        id: currentUserId,
        full_name: 'You'
      },
      _optimistic: true,
      _pending: true,
      _tempId: tempId
    };

    setMessages(prev => [...prev, optimisticMessage]);
    return tempId;
  }, [chatId, currentUserId]);

  // Send message with optimistic update
  const sendMessageOptimistic = useCallback(async (
    content: string,
    messageType: string = 'text',
    mediaUrl?: string,
    mediaType?: string,
    mediaSize?: number
  ) => {
    const tempId = addOptimisticMessage(content, messageType, mediaUrl, mediaType, mediaSize);
    if (!tempId) return;

    try {
      await onSendMessage(content, messageType, mediaUrl, mediaType, mediaSize);
      
      // Mark as successful (real message will replace this via real-time)
      setMessages(prev => prev.map(msg => 
        msg._tempId === tempId 
          ? { ...msg, _pending: false, _optimistic: false }
          : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark as failed
      setMessages(prev => prev.map(msg => 
        msg._tempId === tempId 
          ? { ...msg, _pending: false, _failed: true }
          : msg
      ));

      toast({
        title: "Message Failed",
        description: "Message failed to send. Please try again.",
        variant: "destructive",
      });
    }
  }, [addOptimisticMessage, onSendMessage, toast]);

  // Retry failed message
  const retrySendMessage = useCallback(async (
    tempId: string,
    content: string,
    messageType: string = 'text',
    mediaUrl?: string,
    mediaType?: string,
    mediaSize?: number
  ) => {
    // Mark as pending again
    setMessages(prev => prev.map(msg => 
      msg._tempId === tempId 
        ? { ...msg, _pending: true, _failed: false }
        : msg
    ));

    try {
      await onSendMessage(content, messageType, mediaUrl, mediaType, mediaSize);
      
      setMessages(prev => prev.map(msg => 
        msg._tempId === tempId 
          ? { ...msg, _pending: false, _optimistic: false }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg._tempId === tempId 
          ? { ...msg, _pending: false, _failed: true }
          : msg
      ));

      toast({
        title: "Message Failed Again",
        description: "Please check your connection",
        variant: "destructive",
      });
    }
  }, [onSendMessage, toast]);

  // Edit message with optimistic update
  const editMessageOptimistic = useCallback(async (messageId: string, newContent: string) => {
    const originalMessage = messages.find(msg => msg.id === messageId);
    if (!originalMessage) return;

    // Optimistically update
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            content: newContent, 
            is_edited: true,
            _optimistic: true,
            _pending: true
          }
        : msg
    ));

    try {
      await onEditMessage(messageId, newContent);
      
      // Mark as successful
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, _pending: false }
          : msg
      ));
    } catch (error) {
      // Revert on failure
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...originalMessage,
              _failed: true
            }
          : msg
      ));

      toast({
        title: "Edit Failed",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  }, [messages, onEditMessage, toast]);

  // Delete message with optimistic update
  const deleteMessageOptimistic = useCallback(async (messageId: string) => {
    const originalMessage = messages.find(msg => msg.id === messageId);
    if (!originalMessage) return;

    // Optimistically remove
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    try {
      await onDeleteMessage(messageId);
    } catch (error) {
      // Restore on failure
      setMessages(prev => {
        const restored = [...prev, { ...originalMessage, _failed: true }];
        return restored.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      toast({
        title: "Delete Failed",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  }, [messages, onDeleteMessage, toast]);

  // Update messages from real-time (merge with optimistic)
  const updateMessagesFromRealtime = useCallback((newMessages: OptimisticMessage[]) => {
    setMessages(prev => {
      // Remove optimistic messages that have been confirmed by real-time
      const withoutConfirmed = prev.filter(msg => {
        if (!msg._optimistic && !msg._tempId) return true;
        
        // Check if this optimistic message is now confirmed
        const confirmed = newMessages.find(newMsg => 
          newMsg.sender_id === msg.sender_id &&
          newMsg.content === msg.content &&
          Math.abs(new Date(newMsg.created_at).getTime() - new Date(msg.created_at).getTime()) < 5000 // 5 second tolerance
        );
        
        return !confirmed;
      });

      // Merge with new messages
      const messageMap = new Map();
      
      // Add existing messages (optimistic ones)
      withoutConfirmed.forEach(msg => messageMap.set(msg.id, msg));
      
      // Add/update with real messages
      newMessages.forEach(msg => messageMap.set(msg.id, msg));

      // Convert back to array and sort
      const merged = Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      return merged;
    });
  }, []);

  // Remove failed messages
  const removeFailedMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => msg._tempId !== tempId));
  }, []);

  return {
    messages,
    loading,
    setLoading,
    sendMessage: sendMessageOptimistic,
    editMessage: editMessageOptimistic,
    deleteMessage: deleteMessageOptimistic,
    updateMessagesFromRealtime,
    removeFailedMessage,
    retrySendMessage,
  };
};