import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Pin, 
  Users, 
  Archive,
  MoreHorizontal,
  Hash,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Chat } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
  onArchive: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  isSelected,
  onClick,
  onArchive
}) => {
  const { user } = useAuth();
  const getChatDisplayName = () => {
    if (chat.chat_type === 'group') {
      return chat.name || 'Group Chat';
    }
    if (chat.chat_type === 'team') {
      return chat.name || 'Team Chat';
    }
    // For private chats, show the other participant's name (not current user)
    const otherParticipant = chat.chat_participants.find(p => 
      p.profiles && p.user_id !== user?.id
    );
    return otherParticipant?.profiles?.full_name || chat.name || 'Private Chat';
  };

  const getChatAvatar = () => {
    const name = getChatDisplayName();
    if (chat.chat_type === 'group') {
      return <Users className="h-4 w-4" />;
    }
    if (chat.chat_type === 'team') {
      return <Hash className="h-4 w-4" />;
    }
    return name.charAt(0).toUpperCase();
  };

  const getParticipantCount = () => {
    return chat.chat_participants?.length || 0;
  };

  const getLastActivity = () => {
    if (chat.last_message_at) {
      return formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true });
    }
    return formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg cursor-pointer transition-colors",
        "hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm">
              {getChatAvatar()}
            </AvatarFallback>
          </Avatar>
          
          {/* Online indicator for private chats */}
          {chat.chat_type === 'private' && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate">
                {getChatDisplayName()}
              </h4>
              
              {/* Icons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {chat.is_pinned && (
                  <Pin className="h-3 w-3 text-muted-foreground" />
                )}
                {chat.chat_type === 'private' && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Timestamp */}
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {getLastActivity()}
            </span>
          </div>

          {/* Last message preview or participant count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground truncate">
              {chat.chat_type === 'private' 
                ? 'Private conversation'
                : `${getParticipantCount()} member${getParticipantCount() !== 1 ? 's' : ''}`
              }
            </p>

            {/* Unread count */}
            {chat.unread_count && chat.unread_count > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 text-xs flex items-center justify-center">
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-6 w-6 p-0",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                isSelected && "opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}>
              <Archive className="mr-2 h-4 w-4" />
              Archive Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};