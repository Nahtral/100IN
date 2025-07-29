import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, MoreVertical, Phone, Video } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  chat: any;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ chat }) => {
  if (!chat) return null;

  const getChatDisplayName = () => {
    if (chat.chat_type === 'group') {
      return chat.name || `Team Chat`;
    }
    return 'Private Chat';
  };

  const getParticipantCount = () => {
    return chat.chat_participants?.length || 0;
  };

  return (
    <div className="border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {chat.chat_type === 'group' ? (
                <Users className="h-5 w-5" />
              ) : (
                chat.name?.charAt(0) || 'C'
              )}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-foreground">
              {getChatDisplayName()}
            </h3>
            <p className="text-sm text-muted-foreground">
              {chat.chat_type === 'group' 
                ? `${getParticipantCount()} members`
                : 'Private conversation'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Video className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Info</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              {chat.chat_type === 'group' && (
                <>
                  <DropdownMenuItem>Manage Members</DropdownMenuItem>
                  <DropdownMenuItem>Leave Group</DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem className="text-destructive">
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};