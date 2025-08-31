import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Archive, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Chat } from '@/types/chat';

interface ArchivedChatsModalProps {
  open: boolean;
  onClose: () => void;
  onChatRestored: () => void;
}

export const ArchivedChatsModal: React.FC<ArchivedChatsModalProps> = ({
  open,
  onClose,
  onChatRestored
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [archivedChats, setArchivedChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>('');

  useEffect(() => {
    if (open && user) {
      loadArchivedChats();
    }
  }, [open, user]);

  const loadArchivedChats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants (
            id,
            user_id,
            role,
            profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('is_archived', true)
        .eq('chat_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const transformedChats = data.map(chat => ({
        ...chat,
        participants: chat.chat_participants || []
      }));

      setArchivedChats(transformedChats);
    } catch (error) {
      console.error('Error loading archived chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load archived chats"
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
        .update({ is_archived: false })
        .eq('id', chatId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Chat restored successfully"
      });

      setArchivedChats(prev => prev.filter(chat => chat.id !== chatId));
      onChatRestored();
    } catch (error) {
      console.error('Error restoring chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restore chat"
      });
    } finally {
      setActionLoading('');
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
        description: "Chat deleted permanently"
      });

      setArchivedChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete chat"
      });
    } finally {
      setActionLoading('');
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.chat_type === 'group') {
      return chat.name || 'Group Chat';
    }
    if (chat.chat_type === 'team') {
      return chat.name || 'Team Chat';
    }
    const otherParticipant = chat.chat_participants.find(p => p.user_id !== user?.id);
    return otherParticipant?.profiles?.full_name || 'Private Chat';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Archived Chats</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading archived chats...</span>
              </div>
            ) : archivedChats.length > 0 ? (
              archivedChats.map(chat => (
                <div
                  key={chat.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{getChatDisplayName(chat)}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>
                          {chat.chat_participants.length} member{chat.chat_participants.length !== 1 ? 's' : ''}
                        </p>
                        <p>
                          Archived: {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                        </p>
                        <p>
                          Created: {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreChat(chat.id)}
                        disabled={actionLoading === chat.id}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {actionLoading === chat.id ? 'Restoring...' : 'Restore'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteChat(chat.id)}
                        disabled={actionLoading === chat.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {actionLoading === chat.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No archived chats found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};