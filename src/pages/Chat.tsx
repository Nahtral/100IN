import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CreateChatModal } from '@/components/chat/CreateChatModal';
import { ChatOptionsMenu } from '@/components/chat/ChatOptionsMenu';
import { ChatSettingsModal } from '@/components/chat/ChatSettingsModal';
import { SearchHistoryModal } from '@/components/chat/SearchHistoryModal';
import { ArchivedChatsModal } from '@/components/chat/ArchivedChatsModal';
import { ClearHistoryModal } from '@/components/chat/ClearHistoryModal';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface Chat {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  created_by: string;
  participants?: any[];
  chat_participants?: any[];
}

export default function Chat() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      subscribeToChats();
    }
  }, [user]);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants!chat_participants_chat_id_fkey(
            user_id,
            role,
            profiles:user_id(
              full_name,
              avatar_url
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        throw error;
      } else {
        // Transform chat_participants to participants for backward compatibility
        const transformedChats = (data || []).map(chat => ({
          ...chat,
          participants: chat.chat_participants || []
        }));
        setChats(transformedChats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
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

  const handleSearchHistory = () => {
    setShowSearchModal(true);
  };

  const handleManageArchived = () => {
    setShowArchivedModal(true);
  };

  const handleChatSettings = () => {
    setShowSettingsModal(true);
  };

  const handleClearAll = () => {
    setShowClearModal(true);
  };

  const handleChatRestored = () => {
    fetchChats(); // Refresh the chat list
  };

  const handleHistoryCleared = () => {
    fetchChats(); // Refresh the chat list
    if (selectedChatId) {
      // If current chat was cleared, refresh the chat window
      setSelectedChatId(null);
      setSelectedChatId(selectedChatId);
    }
  };

  return (
    <Layout currentUser={currentUser}>
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
                <ChatOptionsMenu
                  onNewChat={() => setShowCreateModal(true)}
                  onSearchHistory={handleSearchHistory}
                  onManageArchived={handleManageArchived}
                  onSettings={handleChatSettings}
                  onClearAll={handleClearAll}
                />
              </div>
            </div>
          </div>
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onChatsUpdate={fetchChats}
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

        {/* Modals */}
        <CreateChatModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onChatCreated={(chatId) => {
            setSelectedChatId(chatId);
            fetchChats();
          }}
        />

        <ChatSettingsModal 
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />

        <SearchHistoryModal 
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelectChat={(chatId) => setSelectedChatId(chatId)}
        />

        <ArchivedChatsModal 
          isOpen={showArchivedModal}
          onClose={() => setShowArchivedModal(false)}
          onChatRestored={handleChatRestored}
        />

        <ClearHistoryModal 
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          onHistoryCleared={handleHistoryCleared}
          selectedChatId={selectedChatId}
        />
      </div>
    </Layout>
  );
}