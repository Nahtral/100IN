import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical,
  Users,
  Hash,
  Lock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Chat, Message } from '@/types/chat';
import { useChatPresence } from '@/hooks/useChatPresence';

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  onSendMessage: (content: string, type?: string, mediaUrl?: string) => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (reactionId: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  onRefresh: () => void;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  loading,
  hasMore,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onLoadMore,
  onRefresh,
  onBack
}) => {
  const { onlineUsers, typingUsers, setTyping } = useChatPresence(chat?.id);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Select a chat to start messaging</p>
      </div>
    );
  }

  const getChatDisplayName = () => {
    if (chat.chat_type === 'group') {
      return chat.name || 'Group Chat';
    }
    if (chat.chat_type === 'team') {
      return chat.name || 'Team Chat';
    }
    const otherParticipant = chat.chat_participants.find(p => p.profiles);
    return otherParticipant?.profiles?.full_name || 'Private Chat';
  };

  const getChatIcon = () => {
    if (chat.chat_type === 'group') {
      return <Users className="h-5 w-5" />;
    }
    if (chat.chat_type === 'team') {
      return <Hash className="h-5 w-5" />;
    }
    return <Lock className="h-5 w-5" />;
  };

  const getParticipantCount = () => {
    return chat.chat_participants?.length || 0;
  };

  const getSubtitle = () => {
    if (chat.chat_type === 'private') {
      return 'Private conversation';
    }
    
    const count = getParticipantCount();
    const onlineCount = onlineUsers.length;
    
    if (onlineCount > 0) {
      return `${count} member${count !== 1 ? 's' : ''} • ${onlineCount} online`;
    }
    
    return `${count} member${count !== 1 ? 's' : ''}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {getChatIcon()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-foreground">
              {getChatDisplayName()}
            </h3>
            <p className="text-sm text-muted-foreground">
              {getSubtitle()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem>
                Search Messages
              </DropdownMenuItem>
              <DropdownMenuItem>
                Chat Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 relative">
        <MessageList
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          typingUsers={typingUsers}
          onLoadMore={onLoadMore}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card">
        <MessageInput
          onSendMessage={onSendMessage}
          onTyping={(typing) => setTyping(chat.id, typing)}
        />
      </div>
    </div>
  );
};