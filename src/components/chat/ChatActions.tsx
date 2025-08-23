import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Archive, MoreVertical, Users, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatActionsProps {
  chat: any;
  onChatUpdated: () => void;
}

export const ChatActions: React.FC<ChatActionsProps> = ({ chat, onChatUpdated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const archiveChat = async () => {
    if (!user || !chat) return;

    const { error } = await supabase
      .from('chats')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.id,
      })
      .eq('id', chat.id);

    if (error) {
      console.error('Error archiving chat:', error);
      toast({
        title: "Error",
        description: "Failed to archive chat",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Chat archived successfully",
      });
      onChatUpdated();
    }
    setShowArchiveDialog(false);
  };

  const unarchiveChat = async () => {
    if (!user || !chat) return;

    const { error } = await supabase
      .from('chats')
      .update({
        is_archived: false,
        archived_at: null,
        archived_by: null,
      })
      .eq('id', chat.id);

    if (error) {
      console.error('Error unarchiving chat:', error);
      toast({
        title: "Error",
        description: "Failed to unarchive chat",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Chat unarchived successfully",
      });
      onChatUpdated();
    }
  };

  if (!chat) return null;

  const canManageChat = chat.created_by === user?.id || user?.id; // Allow all users basic actions

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Users className="h-4 w-4 mr-2" />
              View Members
            </DropdownMenuItem>
            {canManageChat && (
              <>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Chat Settings
                </DropdownMenuItem>
                {chat.is_archived ? (
                  <DropdownMenuItem onClick={unarchiveChat}>
                    <Archive className="h-4 w-4 mr-2" />
                    Unarchive Chat
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Chat
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this chat? You can unarchive it later from the chat settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveChat}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};