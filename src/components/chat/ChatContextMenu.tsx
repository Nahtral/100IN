import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Archive, Trash2, Pin, Search, VolumeX, Copy } from 'lucide-react';

interface ChatContextMenuProps {
  children: React.ReactNode;
  chat: any;
  onArchive: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onPin: (chatId: string) => void;
  onMute: (chatId: string) => void;
  onSearch: (chatId: string) => void;
  onCopy: (chatId: string) => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  children,
  chat,
  onArchive,
  onDelete,
  onPin,
  onMute,
  onSearch,
  onCopy,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onCopy(chat.id)}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSearch(chat.id)}>
          <Search className="mr-2 h-4 w-4" />
          Search Chat History
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onPin(chat.id)}>
          <Pin className="mr-2 h-4 w-4" />
          {chat.is_pinned ? 'Unpin' : 'Sticky on Top'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onMute(chat.id)}>
          <VolumeX className="mr-2 h-4 w-4" />
          Mute Notifications
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onArchive(chat.id)}>
          <Archive className="mr-2 h-4 w-4" />
          {chat.is_archived ? 'Unarchive' : 'Archive'}
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onDelete(chat.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};