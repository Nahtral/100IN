import React, { useState } from 'react';
import { MoreVertical, Edit, Archive, ArchiveRestore, Trash, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Chat } from '@/types/chat';

interface ChatHeaderMenuProps {
  chat: Chat;
  onChatUpdated: () => void;
  isSuperAdmin?: boolean;
}

export const ChatHeaderMenu: React.FC<ChatHeaderMenuProps> = ({
  chat,
  onChatUpdated,
  isSuperAdmin = false,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.name || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isGroup = chat.chat_type === 'group';
  const isArchived = chat.status === 'archived';

  const handleEditTitle = async () => {
    if (!newTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title cannot be empty"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_update_chat', {
        p_chat_id: chat.id,
        p_title: newTitle.trim()
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Chat title updated successfully"
      });
      setEditDialogOpen(false);
      onChatUpdated();
    } catch (error) {
      console.error('Error updating chat title:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update chat title"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    setLoading(true);
    try {
      const newStatus = isArchived ? 'active' : 'archived';
      const { error } = await supabase.rpc('rpc_update_chat', {
        p_chat_id: chat.id,
        p_status: newStatus
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Chat ${isArchived ? 'unarchived' : 'archived'} successfully`
      });
      onChatUpdated();
    } catch (error) {
      console.error('Error toggling archive status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isArchived ? 'unarchive' : 'archive'} chat`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_update_chat', {
        p_chat_id: chat.id,
        p_status: 'deleted'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Chat deleted successfully"
      });
      setDeleteDialogOpen(false);
      onChatUpdated();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete chat"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHardDelete = async () => {
    setLoading(true);
    try {
      // Hard delete: remove chat, participants, and messages
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chat.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Chat permanently deleted"
      });
      setHardDeleteDialogOpen(false);
      onChatUpdated();
    } catch (error) {
      console.error('Error permanently deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to permanently delete chat"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {isGroup && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setNewTitle(chat.name || '');
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Title
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={handleArchiveToggle}>
            {isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>

          {isSuperAdmin && (
            <DropdownMenuItem
              onClick={() => setHardDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Title Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chat Title</DialogTitle>
            <DialogDescription>
              Change the name of this group chat.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
                placeholder="Enter chat title..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditTitle}
              disabled={loading || !newTitle.trim()}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This will hide the chat
              for all participants but can be recovered by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSoftDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chat,
              all messages, and remove all participants. This action is only available
              to administrators.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};