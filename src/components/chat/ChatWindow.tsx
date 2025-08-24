import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { useToast } from '@/components/ui/use-toast';
import { useOptimisticMessages } from '@/hooks/useOptimisticMessages';
import { useChatOptimizations } from '@/hooks/useChatOptimizations';

interface ChatWindowProps {
  chatId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chat, setChat] = useState<any>(null);

  // Original API functions
  const sendMessageAPI = async (content: string, messageType: string = 'text', mediaUrl?: string, mediaType?: string, mediaSize?: number) => {
    if (!user || !content.trim() && !mediaUrl) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content.trim() || null,
        message_type: messageType,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        media_size: mediaSize || null,
      });

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const editMessageAPI = async (messageId: string, newContent: string) => {
    if (!user) return;

    const { data: originalMessage } = await supabase
      .from('messages')
      .select('content, edit_history')
      .eq('id', messageId)
      .single();

    if (!originalMessage) return;

    const editHistory = Array.isArray(originalMessage.edit_history) 
      ? originalMessage.edit_history 
      : [];
    
    const updatedHistory = [...editHistory, {
      content: originalMessage.content,
      edited_at: new Date().toISOString(),
    }];

    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        edit_history: updatedHistory,
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  };

  const deleteMessageAPI = async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  // Use optimistic messages hook
  const {
    messages,
    loading,
    setLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    updateMessagesFromRealtime,
  } = useOptimisticMessages({
    chatId,
    currentUserId: user?.id,
    onSendMessage: sendMessageAPI,
    onEditMessage: editMessageAPI,
    onDeleteMessage: deleteMessageAPI,
  });

  // Use chat optimizations hook
  const {
    loadMoreMessages,
    hasMore,
    loadingMore,
    refreshMessages,
  } = useChatOptimizations({
    chatId,
    onMessagesUpdate: updateMessagesFromRealtime,
    setLoading,
  });

  // Fetch chat details
  useEffect(() => {
    if (chatId) {
      fetchChat();
    }
  }, [chatId]);

  const fetchChat = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants!chat_participants_chat_id_fkey(
          user_id,
          role,
          profiles:user_id(full_name)
        )
      `)
      .eq('id', chatId)
      .single();

    if (error) {
      console.error('Error fetching chat:', error);
      toast({
        title: "Error",
        description: "Failed to load chat details",
        variant: "destructive",
      });
    } else {
      setChat(data);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const archiveMessage = async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({
        is_archived: true,
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error archiving message:', error);
      toast({
        title: "Error",
        description: "Failed to archive message",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Message archived",
      });
    }
  };

  const recallMessage = async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({
        is_recalled: true,
        recalled_at: new Date().toISOString(),
        recalled_by: user.id,
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error recalling message:', error);
      toast({
        title: "Error",
        description: "Failed to recall message",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Message recalled",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chat={chat} onChatUpdated={fetchChat} />
      
      <VirtualizedMessageList
        messages={messages}
        currentUserId={user?.id}
        onAddReaction={addReaction}
        onRemoveReaction={removeReaction}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onArchiveMessage={archiveMessage}
        onRecallMessage={recallMessage}
        onLoadMore={loadMoreMessages}
        hasMore={hasMore}
        loadingMore={loadingMore}
      />

      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
};