import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Chat, ChatError } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ProductionChatSidebarProps {
  chats: Chat[];
  loading: boolean;
  error: ChatError | null;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onRetry: (operation: string) => void;
}

export const ProductionChatSidebar: React.FC<ProductionChatSidebarProps> = ({
  chats,
  loading,
  error,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  onRefresh,
  onLoadMore,
  onRetry
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredChats = React.useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    return chats.filter(chat =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.last_message_content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  const pinnedChats = filteredChats.filter(chat => chat.is_pinned);
  const regularChats = filteredChats.filter(chat => !chat.is_pinned);

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name && chat.name !== 'Chat') return chat.name;
    if (chat.chat_type === 'private') {
      return chat.participant_count === 2 ? 'Direct Message' : 'Private Chat';
    }
    return chat.chat_type === 'group' ? 'Group Chat' : 'Team Chat';
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const ChatItem = ({ chat }: { chat: Chat }) => (
    <div
      className={cn(
        "flex items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
        selectedChatId === chat.id && "bg-primary/10 border-l-2 border-primary"
      )}
      onClick={() => onSelectChat(chat.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm text-foreground truncate">
            {getChatDisplayName(chat)}
          </h4>
          <div className="flex items-center gap-1 ml-2">
            {chat.unread_count > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </span>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatLastActivity(chat.last_message_at)}
            </span>
          </div>
        </div>
        
        {chat.last_message_content && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate">
              {chat.last_message_sender && (
                <span className="font-medium">{chat.last_message_sender}: </span>
              )}
              {chat.last_message_content}
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {chat.participant_count} {chat.participant_count === 1 ? 'member' : 'members'}
          </span>
          {chat.is_pinned && (
            <span className="text-xs text-primary font-medium">📌 Pinned</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Chats</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              onClick={onCreateChat}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.code}: {error.message}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry('load_chats')}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading && chats.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Pinned Chats */}
              {pinnedChats.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    Pinned
                  </h3>
                  <div className="space-y-1">
                    {pinnedChats.map(chat => (
                      <ChatItem key={chat.id} chat={chat} />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Chats */}
              {regularChats.length > 0 ? (
                <div className="space-y-1">
                  {pinnedChats.length > 0 && (
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      All Chats
                    </h3>
                  )}
                  {regularChats.map(chat => (
                    <ChatItem key={chat.id} chat={chat} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No chats found' : 'No chats yet'}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCreateChat}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first chat
                    </Button>
                  )}
                </div>
              )}

              {/* Load More Button */}
              {chats.length > 0 && chats.length % 30 === 0 && (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      'Load More Chats'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};