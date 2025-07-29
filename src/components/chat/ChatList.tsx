import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Users, MessageCircle } from 'lucide-react';

interface ChatListProps {
  chats: any[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
}) => {
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
    // For private chats, we'd need to get the other participant's name
    return 'Private Chat';
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
          <div
            key={chat.id}
            className={cn(
              "mobile-card cursor-pointer transition-all duration-200 touch-manipulation border-b border-border last:border-b-0",
              isSelected ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted/50 active:bg-muted/30"
            )}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0">
                <AvatarFallback className="text-sm sm:text-base">
                  {chat.chat_type === 'group' ? (
                    <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                  ) : (
                    <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                  )}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground truncate text-sm sm:text-base">
                    {getChatDisplayName(chat)}
                  </h4>
                  {lastMessage && (
                    <span className="text-xs opacity-70 shrink-0 ml-2">
                      {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs sm:text-sm opacity-70 truncate leading-relaxed">
                    {getChatDisplayContent(lastMessage)}
                  </p>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs ml-2 shrink-0">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                
                {chat.chat_type === 'group' && (
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="h-3 w-3 opacity-60" />
                    <span className="text-xs opacity-60">
                      {chat.chat_participants?.length || 0} members
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {chats.length === 0 && (
        <div className="p-6 sm:p-8 text-center">
          <MessageCircle className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4" />
          <p className="text-base sm:text-lg text-muted-foreground mb-2">No chats yet</p>
          <p className="text-sm text-muted-foreground">
            Start a conversation to begin chatting
          </p>
        </div>
      )}
    </div>
  );
};