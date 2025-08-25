import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Archive, ArchiveRestore, Trash2, MessageCircle, Users } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from 'date-fns';

interface ArchivedChat {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
  last_message_time: string;
  created_by: string;
}

interface ArchivedChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatRestored: () => void;
}

export const ArchivedChatsModal: React.FC<ArchivedChatsModalProps> = ({
  isOpen,
  onClose,
  onChatRestored,
}) => {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadArchivedChats();
    }
  }, [isOpen, currentUser]);

  const loadArchivedChats = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // For now, just return empty results since we don't have proper user ID access
      setArchivedChats([]);
      setLoading(false);
      return;
    } catch (error) {
      console.error('Error loading archived chats:', error);
      toast({
        title: "Error",
        description: "Failed to load archived chats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreChat = async (chatId: string) => {
    setActionLoading(chatId);
    try {
      const { error } = await supabase
        .from('chats')
        .update({ is_archived: false, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Chat restored successfully",
      });

      // Remove from local state
      setArchivedChats(prev => prev.filter(chat => chat.id !== chatId));
      onChatRestored();
    } catch (error) {
      console.error('Error restoring chat:', error);
      toast({
        title: "Error",
        description: "Failed to restore chat",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to permanently delete this chat? This action cannot be undone.')) {
      return;
    }

    setActionLoading(chatId);
    try {
      // Delete messages first
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) throw messagesError;

      // Delete participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId);

      if (participantsError) throw participantsError;

      // Delete chat
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) throw chatError;

      toast({
        title: "Success",
        description: "Chat deleted permanently",
      });

      // Remove from local state
      setArchivedChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Archived Chats</DialogTitle>
          <DialogDescription>
            View, restore, or permanently delete your archived conversations.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading archived chats...
            </div>
          ) : archivedChats.length > 0 ? (
            <div className="space-y-3">
              {archivedChats.map((chat) => (
                <div
                  key={chat.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium truncate">{chat.name}</h4>
                        <Badge variant="secondary" className="shrink-0">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {chat.participant_count} member{chat.participant_count !== 1 ? 's' : ''}
                        </div>
                        <div>
                          Last activity: {formatDistanceToNow(new Date(chat.last_message_time), { addSuffix: true })}
                        </div>
                        <div>
                          Created: {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreChat(chat.id)}
                          disabled={actionLoading === chat.id}
                        >
                          <ArchiveRestore className="h-3 w-3 mr-1" />
                          {actionLoading === chat.id ? 'Restoring...' : 'Restore'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteChat(chat.id)}
                          disabled={actionLoading === chat.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {actionLoading === chat.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No archived chats found</p>
              <p className="text-xs mt-1">Archived conversations will appear here</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};