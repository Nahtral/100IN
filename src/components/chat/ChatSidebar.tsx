import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Archive, 
  Settings,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { ChatListItem } from './ChatListItem';
import { Chat } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  chats: Chat[];
  loading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onShowSettings: () => void;
  onShowArchived: () => void;
  onShowSearch: () => void;
  onArchiveChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRefresh: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  loading,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  onShowSettings,
  onShowArchived,
  onShowSearch,
  onArchiveChat,
  onDeleteChat,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredChats = React.useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    return chats.filter(chat =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.chat_participants.some(p => 
        p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [chats, searchQuery]);

  const activeChats = filteredChats.filter(chat => !chat.is_archived);
  const pinnedChats = activeChats.filter(chat => chat.is_pinned);
  const regularChats = activeChats.filter(chat => !chat.is_pinned);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onShowSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Search Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShowArchived}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archived Chats
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Chat Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
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
                       <ChatListItem
                         key={chat.id}
                         chat={chat}
                         isSelected={chat.id === selectedChatId}
                         onClick={() => onSelectChat(chat.id)}
                         onArchive={() => onArchiveChat(chat.id)}
                         onDelete={() => onDeleteChat(chat.id)}
                       />
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
                     <ChatListItem
                       key={chat.id}
                       chat={chat}
                       isSelected={chat.id === selectedChatId}
                       onClick={() => onSelectChat(chat.id)}
                       onArchive={() => onArchiveChat(chat.id)}
                       onDelete={() => onDeleteChat(chat.id)}
                     />
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
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};