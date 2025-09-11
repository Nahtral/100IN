import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Reply, 
  Edit, 
  RotateCcw, 
  Trash, 
  MoreHorizontal 
} from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

interface MessageActionsProps {
  message: ChatMessage;
  isOwner: boolean;
  onReply: (message: ChatMessage) => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onRecall: (messageId: string) => Promise<void>;
  onDeleteForMe: (messageId: string) => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isOwner,
  onReply,
  onEdit,
  onRecall,
  onDeleteForMe,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [loading, setLoading] = useState(false);

  const messageAge = Date.now() - new Date(message.created_at).getTime();
  const canEdit = isOwner && messageAge < 15 * 60 * 1000; // 15 minutes
  const canRecall = isOwner && messageAge < 2 * 60 * 1000; // 2 minutes
  const isRecalled = message.status === 'recalled';

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      await onEdit(message.id, editContent.trim());
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error editing message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async () => {
    setLoading(true);
    try {
      await onRecall(message.id);
      setRecallDialogOpen(false);
    } catch (error) {
      console.error('Error recalling message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
            <span className="sr-only">Message options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!isRecalled && (
            <>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {canEdit && !isRecalled && (
            <DropdownMenuItem 
              onClick={() => {
                setEditContent(message.content);
                setEditDialogOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}

          {canRecall && !isRecalled && (
            <DropdownMenuItem 
              onClick={() => setRecallDialogOpen(true)}
              className="text-orange-600 focus:text-orange-600"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Recall
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => onDeleteForMe(message.id)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete for me
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Message Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Make changes to your message. You have {Math.max(0, Math.ceil((15 * 60 * 1000 - messageAge) / 60000))} minutes left to edit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px]"
            />
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
              onClick={handleEdit}
              disabled={loading || !editContent.trim()}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recall Message Dialog */}
      <AlertDialog open={recallDialogOpen} onOpenChange={setRecallDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recall Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to recall this message? This will remove it for all participants. 
              You have {Math.max(0, Math.ceil((2 * 60 * 1000 - messageAge) / 60000))} minutes left to recall.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRecall}
              className="bg-orange-600 text-white hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? 'Recalling...' : 'Recall Message'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};