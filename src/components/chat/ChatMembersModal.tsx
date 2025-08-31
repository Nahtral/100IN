import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Crown, Shield } from 'lucide-react';
import { Chat } from '@/types/chat';

interface ChatMembersModalProps {
  open: boolean;
  onClose: () => void;
  chat: Chat | null;
}

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({
  open,
  onClose,
  chat
}) => {
  if (!chat) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "default",
      moderator: "secondary",
      member: "outline"
    };
    
    return (
      <Badge variant={variants[role] || "outline"} className="text-xs">
        {role}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chat Members ({chat.chat_participants?.length || 0})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {chat.chat_participants?.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {participant.profiles?.full_name
                        ? participant.profiles.full_name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                        : 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {participant.profiles?.full_name || 'Unknown User'}
                      </p>
                      {getRoleIcon(participant.role)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.profiles?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getRoleBadge(participant.role)}
                  {/* Online status indicator */}
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No members found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};