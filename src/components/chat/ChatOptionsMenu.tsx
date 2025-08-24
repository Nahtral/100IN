import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Archive, Trash2, Pin, Search, VolumeX, Settings } from 'lucide-react';

interface ChatOptionsMenuProps {
  onNewChat: () => void;
  onSearchHistory: () => void;
  onManageArchived: () => void;
  onSettings: () => void;
  onClearAll: () => void;
}

export const ChatOptionsMenu: React.FC<ChatOptionsMenuProps> = ({
  onNewChat,
  onSearchHistory,
  onManageArchived,
  onSettings,
  onClearAll,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onSearchHistory}>
          <Search className="mr-2 h-4 w-4" />
          Search Chat History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onManageArchived}>
          <Archive className="mr-2 h-4 w-4" />
          Manage Archived Chats
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Chat Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onClearAll}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Chat History
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};