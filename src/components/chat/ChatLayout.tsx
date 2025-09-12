import React from 'react';
import { cn } from '@/lib/utils';
import { ProductionChatSidebar } from './ProductionChatSidebar';
import { EnhancedProductionChatWindow } from './EnhancedProductionChatWindow';
import { CreateChatModal } from './CreateChatModal';
import { OfflineBanner } from './OfflineBanner';
import { useProductionChatEdge } from '@/hooks/useProductionChatEdge';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatLayoutProps {
  className?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ className }) => {
  const isMobile = useIsMobile();
  
  const {
    chats,
    loading,
    selectedChat,
    messages,
    messagesLoading,
    hasMoreMessages,
    hasMoreChats,
    error,
    isOnline,
    selectChat,
    createChat,
    sendMessage,
    loadMoreMessages,
    loadMoreChats,
    markAsRead,
    refreshChats,
    refreshMessages,
    retry,
    renameChat,
    archiveChat,
    deleteChat,
    editMessage,
    recallMessage
  } = useProductionChatEdge();

  console.log('ChatLayout - Debug Info:', {
    chatsCount: chats.length,
    loading,
    selectedChat: selectedChat?.id || null,
    error: error?.message || null,
    isOnline
  });

  // Get online status from the hook

  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // Handler for mobile back navigation
  const handleBack = React.useCallback(() => {
    selectChat(null);
  }, [selectChat]);

  // Mobile: show chat window when chat is selected
  const showChatWindow = selectedChat && (isMobile ? true : true);
  const showSidebar = !isMobile || !selectedChat;

  return (
    <div className={cn(
      "flex h-full bg-background flex-col",
      className
    )}>
      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} />
      
      <div className="flex flex-1">
        {/* Chat Sidebar */}
      {showSidebar && (
        <div className={cn(
          "border-r border-border bg-card",
          isMobile ? "w-full" : "w-80 min-w-80"
        )}>
      <ProductionChatSidebar
        chats={chats}
        loading={loading}
        error={error}
        selectedChatId={selectedChat?.id || null}
        onSelectChat={(chatId) => {
          const chat = chats.find(c => c.id === chatId);
          if (chat) selectChat(chat);
        }}
        onCreateChat={() => setShowCreateModal(true)}
        onRefresh={refreshChats}
        onLoadMore={loadMoreChats}
        onRetry={(operation) => retry()}
        onRenameChat={renameChat}
        onArchiveChat={archiveChat}
        onDeleteChat={deleteChat}
      />
        </div>
      )}

      {/* Chat Window */}
      {showChatWindow && (
        <div className="flex-1 flex flex-col min-w-0">
          <EnhancedProductionChatWindow
            chat={selectedChat}
            messages={messages}
            loading={messagesLoading}
            hasMore={hasMoreMessages}
            error={error}
            onSendMessage={sendMessage}
            onLoadMore={loadMoreMessages}
            onRefresh={refreshMessages}
            onBack={isMobile ? handleBack : undefined}
            onMarkAsRead={() => selectedChat && markAsRead(selectedChat.id)}
            onRetry={(operation) => retry()}
            onEditMessage={editMessage}
            onRecallMessage={recallMessage}
          />
        </div>
      )}

        {/* Empty State */}
      {!selectedChat && !isMobile && (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div className="max-w-md">
            {error ? (
              <>
                <h3 className="text-xl font-semibold text-destructive mb-2">
                  Connection Error
                </h3>
                <p className="text-muted-foreground mb-4">
                  {error.message || 'Failed to load chats'}
                </p>
                <button
                  onClick={retry}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors mr-2"
                >
                  Retry Connection
                </button>
                <button
                  onClick={refreshChats}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Refresh Chats
                </button>
              </>
            ) : loading ? (
              <>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Loading Chats...
                </h3>
                <p className="text-muted-foreground mb-4">
                  Please wait while we load your conversations.
                </p>
                <div className="animate-pulse w-8 h-8 bg-primary/20 rounded-full mx-auto"></div>
              </>
            ) : chats.length === 0 ? (
              <>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Chats Yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  You haven't joined any conversations yet. Create your first chat to get started.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create New Chat
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Welcome to Chat
                </h3>
                <p className="text-muted-foreground mb-6">
                  Select a chat from the sidebar to start messaging, or create a new chat to get started.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create New Chat
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateChatModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      onChatCreated={async (chatId) => {
        try {
          setShowCreateModal(false);
          if (chatId) {
            await refreshChats();
            // Find and select the new chat
            const chat = chats.find(c => c.id === chatId);
            if (chat) selectChat(chat);
          }
        } catch (error) {
          console.error('Error after chat creation:', error);
        }
      }}
      />
      </div>
    </div>
  );
};