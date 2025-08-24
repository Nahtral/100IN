import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Users, MessageCircle, Pin } from 'lucide-react';
import { ChatContextMenu } from './ChatContextMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface ChatListProps {
  chats: any[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onChatsUpdate?: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onChatsUpdate,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (chats.length > 0) {
      fetchLastMessages();
      fetchUnreadCounts();
    }
  }, [chats]);

  const fetchLastMessages = async () => {
    const chatIds = chats.map(chat => chat.id);
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id(full_name)
      `)
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })
      .limit(1);

    const messageMap: Record<string, any> = {};
    data?.forEach(message => {
      if (!messageMap[message.chat_id]) {
        messageMap[message.chat_id] = message;
      }
    });
    setLastMessages(messageMap);
  };

  const fetchUnreadCounts = async () => {
    // This would require implementing read status tracking
    // For now, we'll use placeholder logic
    const counts: Record<string, number> = {};
    chats.forEach(chat => {
      counts[chat.id] = 0; // Placeholder
    });
    setUnreadCounts(counts);
  };

  const getChatDisplayName = (chat: any) => {
    if (chat.chat_type === 'group') {
      return chat.name || `Team Chat`;
    }
    
    // For private chats, get the other participant's name
    const otherParticipant = chat.chat_participants?.find(
      (p: any) => p.user_id !== user?.id
    );
    
    return otherParticipant?.profiles?.full_name || 'Private Chat';
  };

  const getChatAvatar = (chat: any) => {
    if (chat.chat_type === 'group') {
      return null; // Group chats don't have individual avatars
    }
    
    // For private chats, get the other participant's avatar
    const otherParticipant = chat.chat_participants?.find(
      (p: any) => p.user_id !== user?.id
    );
    
    return otherParticipant?.profiles?.avatar_url;
  };

  const handleArchiveChat = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    const newArchivedState = !chat?.is_archived;
    
    const { error } = await supabase
      .from('chats')
      .update({ is_archived: newArchivedState })
      .eq('id', chatId);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${newArchivedState ? 'archive' : 'unarchive'} chat`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Chat ${newArchivedState ? 'archived' : 'unarchived'}`,
      });
      onChatsUpdate?.();
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Chat deleted",
      });
      onChatsUpdate?.();
    }
  };

  const handlePinChat = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    const newPinnedState = !(chat as any)?.is_pinned;
    
    const { error } = await supabase
      .from('chats')
      .update({ is_pinned: newPinnedState } as any)
      .eq('id', chatId);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${newPinnedState ? 'pin' : 'unpin'} chat`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Chat ${newPinnedState ? 'pinned' : 'unpinned'}`,
      });
      onChatsUpdate?.();
    }
  };

  const handleMuteChat = async (chatId: string) => {
    // This would update notification preferences for the chat
    toast({
      title: "Info",
      description: "Mute functionality will be implemented with notification preferences",
    });
  };

  const handleSearchChat = (chatId: string) => {
    // This would open a search modal for the specific chat
    toast({
      title: "Info",
      description: "Search functionality will be implemented",
    });
  };

  const handleCopyChat = (chatId: string) => {
    // This would copy chat information to clipboard
    navigator.clipboard.writeText(chatId);
    toast({
      title: "Success",
      description: "Chat ID copied to clipboard",
    });
  };

  const getChatDisplayContent = (message: any) => {
    if (!message) return 'No messages yet';
    
    switch (message.message_type) {
      case 'image':
        return '📷 Photo';
      case 'video':
        return '🎥 Video';
      case 'file':
        return '📎 File';
      case 'location':
        return '📍 Location';
      case 'link':
        return '🔗 Link';
      default:
        return message.content || 'Message';
    }
  };

  return (
    <div className="overflow-y-auto">
      {chats.map((chat) => {
        const lastMessage = lastMessages[chat.id];
        const unreadCount = unreadCounts[chat.id] || 0;
        const isSelected = selectedChatId === chat.id;

        return (
          <ChatContextMenu
            key={chat.id}
            chat={chat}
            onArchive={handleArchiveChat}
            onDelete={handleDeleteChat}
            onPin={handlePinChat}
            onMute={handleMuteChat}
            onSearch={handleSearchChat}
            onCopy={handleCopyChat}
          >
            <div
              className={cn(
                "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors relative",
                isSelected && "bg-muted"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              {(chat as any).is_pinned && (
                <Pin className="absolute top-2 right-2 h-3 w-3 text-primary" />
              )}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  {getChatAvatar(chat) && (
                    <AvatarImage src={getChatAvatar(chat)} alt="Avatar" />
                  )}
                  <AvatarFallback>
                    {chat.chat_type === 'group' ? (
                      <Users className="h-6 w-6" />
                    ) : (
                      getChatDisplayName(chat).charAt(0).toUpperCase()
                    )}
                  </AvatarFallback>
                 </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground truncate">
                      {getChatDisplayName(chat)}
                      {chat.is_archived && (
                        <span className="text-xs text-muted-foreground ml-1">(Archived)</span>
                      )}
                    </h4>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {getChatDisplayContent(lastMessage)}
                    </p>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  {chat.chat_type === 'group' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {chat.chat_participants?.length || 0} members
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ChatContextMenu>
        );
      })}
      
      {chats.length === 0 && (
        <div className="p-8 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No chats yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start a conversation to begin chatting
          </p>
        </div>
      )}
    </div>
  );
};