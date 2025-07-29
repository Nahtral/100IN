import React, { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

export default function Chat() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchChats();
      subscribeToChats();
    }
  }, [user]);

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants!inner(
          user_id,
          role
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
    } else {
      setChats(data || []);
    }
  };

  const subscribeToChats = () => {
    const channel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-border bg-background">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Chats</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Users className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/50">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Select a chat to start messaging
              </h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to begin chatting
              </p>
            </div>
          </div>
        )}
      </div>

      <CreateChatModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChatCreated={(chatId) => {
          setSelectedChatId(chatId);
          fetchChats();
        }}
      />
    </div>
  );
}