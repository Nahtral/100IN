import React from 'react';
import { cn } from '@/lib/utils';
import { ChatSidebar } from './ChatSidebar';
import { ChatWindow } from './ChatWindow';
import { ChatSearch } from './ChatSearch';
import { CreateChatModal } from './CreateChatModal';
import { ChatSettingsModal } from './ChatSettingsModal';
import { ArchivedChatsModal } from './ArchivedChatsModal';
import { useChat } from '@/hooks/useChat';
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
    hasMore,
    selectChat,
    createChat,
    sendMessage,
    editMessage,
    deleteMessage,
    archiveChat,
    unarchiveChat,
    addReaction,
    removeReaction,
    loadMoreMessages,
    refreshChats,
    refreshMessages
  } = useChat();

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [showArchivedModal, setShowArchivedModal] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);

  // Mobile: show chat window when chat is selected
  const showChatWindow = selectedChat && (isMobile ? true : true);
  const showSidebar = !isMobile || !selectedChat;

  return (
    <div className={cn(
      "flex h-full bg-background",
      className
    )}>
      {/* Chat Sidebar */}
      {showSidebar && (
        <div className={cn(
          "border-r border-border bg-card",
          isMobile ? "w-full" : "w-80 min-w-80"
        )}>
          <ChatSidebar
            chats={chats}
            loading={loading}
            selectedChatId={selectedChat?.id || null}
            onSelectChat={selectChat}
            onCreateChat={() => setShowCreateModal(true)}
            onShowSettings={() => setShowSettingsModal(true)}
            onShowArchived={() => setShowArchivedModal(true)}
            onShowSearch={() => setShowSearch(true)}
            onArchiveChat={archiveChat}
            onRefresh={refreshChats}
          />
        </div>
      )}

      {/* Chat Window */}
      {showChatWindow && (
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            chat={selectedChat}
            messages={messages}
            loading={messagesLoading}
            hasMore={hasMore}
            onSendMessage={sendMessage}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            onAddReaction={addReaction}
            onRemoveReaction={removeReaction}
            onLoadMore={loadMoreMessages}
            onRefresh={refreshMessages}
            onBack={isMobile ? () => selectChat('') : undefined}
          />
        </div>
      )}

      {/* Empty State */}
      {!selectedChat && !isMobile && (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div className="max-w-md">
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
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateChatModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChatCreated={async (chatId) => {
          setShowCreateModal(false);
          if (chatId) {
            await refreshChats();
            selectChat(chatId);
          }
        }}
      />

      <ChatSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ArchivedChatsModal
        open={showArchivedModal}
        onClose={() => setShowArchivedModal(false)}
        onChatRestored={refreshChats}
      />

      {showSearch && (
        <ChatSearch
          onClose={() => setShowSearch(false)}
          onSelectChat={(chatId) => {
            setShowSearch(false);
            selectChat(chatId);
          }}
        />
      )}
    </div>
  );
};