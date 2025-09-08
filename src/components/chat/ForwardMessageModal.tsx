import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/types/chat';

interface Chat {
  id: string;
  name: string;
  chat_type: 'group' | 'private';
  participant_count: number;
}

interface ForwardMessageModalProps {
  message: ChatMessage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForwarded: () => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  message,
  open,
  onOpenChange,
  onForwarded,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadChats();
      setSelectedChats([]);
    }
  }, [open]);

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const { data, error } = await supabase.rpc('rpc_list_chats', {
        limit_n: 50,
        offset_n: 0
      });

      if (error) throw error;

      // Filter out the current chat
      const filteredChats = data?.filter((chat: any) => chat.chat_id !== message.chat_id) || [];
      
      setChats(filteredChats.map((chat: any) => ({
        id: chat.chat_id,
        name: chat.chat_title || 'Unknown Chat',
        chat_type: chat.chat_is_group ? 'group' : 'private',
        participant_count: 2 // Default for now
      })));
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load chats"
      });
    } finally {
      setLoadingChats(false);
    }
  };

  const handleChatToggle = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleForward = async () => {
    if (selectedChats.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one chat"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_forward_message', {
        p_source_message_id: message.id,
        p_target_chat_ids: selectedChats
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Message forwarded to ${selectedChats.length} chat${selectedChats.length > 1 ? 's' : ''}`
      });
      
      onOpenChange(false);
      onForwarded();
    } catch (error: any) {
      console.error('Error forwarding message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to forward message"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
          <DialogDescription>
            Select chats to forward this message to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="p-3 bg-muted rounded-lg border-l-4 border-primary">
            <p className="text-sm text-muted-foreground mb-1">Forwarding:</p>
            <p className="text-sm line-clamp-3">{message.content}</p>
          </div>

          {/* Chat List */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Select chats:</p>
            <ScrollArea className="h-48 border rounded-md p-2">
              {loadingChats ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading chats...</p>
                </div>
              ) : chats.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No other chats available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleChatToggle(chat.id)}
                    >
                      <Checkbox
                        checked={selectedChats.includes(chat.id)}
                        onCheckedChange={() => handleChatToggle(chat.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{chat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {chat.chat_type === 'group' ? 'Group' : 'Direct'} chat
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedChats.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedChats.length} chat{selectedChats.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleForward}
            disabled={loading || selectedChats.length === 0}
          >
            {loading ? (
              'Forwarding...'
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Forward
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};