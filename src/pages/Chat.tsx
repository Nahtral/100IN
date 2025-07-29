import React, { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

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
    <div className="flex h-[calc(100vh-60px)] bg-background">
      {/* Mobile-optimized Chat List Sidebar */}
      <div className={cn(
        "w-full sm:w-80 lg:w-96 border-r border-border bg-background transition-all duration-300",
        selectedChatId ? "hidden sm:block sm:w-80 lg:w-96" : "block"
      )}>
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Chats</h2>
            <div className="flex gap-2">
              <Button
                size="mobile"
                variant="outline"
                onClick={() => setShowCreateModal(true)}
                className="min-h-[44px]"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New</span>
              </Button>
              {isSuperAdmin && (
                <Button
                  size="mobile"
                  variant="outline"
                  onClick={() => setShowCreateModal(true)}
                  className="min-h-[44px]"
                >
                  <Users className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Group</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={(chatId) => {
            setSelectedChatId(chatId);
          }}
        />
      </div>

      {/* Mobile-optimized Chat Window */}
      <div className={cn(
        "flex-1 min-w-0",
        selectedChatId ? "block" : "hidden sm:block"
      )}>
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/50 p-4">
            <div className="text-center max-w-sm">
              <Users className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                Select a chat to start messaging
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
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