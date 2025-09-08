import React, { useState } from 'react';
import { 
  Reply, 
  Forward, 
  Edit, 
  RotateCcw, 
  Trash, 
  Languages,
  MoreHorizontal 
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ForwardMessageModal } from './ForwardMessageModal';
import type { ChatMessage } from '@/types/chat';

interface MessageBubbleMenuProps {
  message: ChatMessage;
  isOwner: boolean;
  onReply: (message: ChatMessage) => void;
  onMessageUpdated: () => void;
  onDeleteForMe: (messageId: string) => void;
}

export const MessageBubbleMenu: React.FC<MessageBubbleMenuProps> = ({
  message,
  isOwner,
  onReply,
  onMessageUpdated,
  onDeleteForMe,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recallDialogOpen, setRecallDialogOpen] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const { toast } = useToast();

  const messageAge = Date.now() - new Date(message.created_at).getTime();
  const canEdit = isOwner && messageAge < 15 * 60 * 1000; // 15 minutes
  const canRecall = isOwner && messageAge < 2 * 60 * 1000; // 2 minutes
  const isRecalled = message.status === 'recalled';

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Message content cannot be empty"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_edit_or_recall_message', {
        p_message_id: message.id,
        p_new_content: editContent.trim(),
        p_recall: false
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message edited successfully"
      });
      setEditDialogOpen(false);
      onMessageUpdated();
    } catch (error: any) {
      console.error('Error editing message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to edit message"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_edit_or_recall_message', {
        p_message_id: message.id,
        p_recall: true
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message recalled successfully"
      });
      setRecallDialogOpen(false);
      onMessageUpdated();
    } catch (error: any) {
      console.error('Error recalling message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to recall message"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    // Mock translation for now - in production would call translation service
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock translation
      setTranslation(`[Translated] ${message.content}`);
      
      toast({
        title: "Success",
        description: "Message translated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Translation failed"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForMe = () => {
    onDeleteForMe(message.id);
    toast({
      title: "Success",
      description: "Message hidden for you"
    });
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
              
              <DropdownMenuItem onClick={() => setForwardDialogOpen(true)}>
                <Forward className="mr-2 h-4 w-4" />
                Forward
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

          <DropdownMenuItem onClick={handleDeleteForMe}>
            <Trash className="mr-2 h-4 w-4" />
            Delete for me
          </DropdownMenuItem>

          {!isRecalled && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleTranslate} disabled={loading}>
                <Languages className="mr-2 h-4 w-4" />
                {loading ? 'Translating...' : 'Translate'}
              </DropdownMenuItem>
            </>
          )}
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

      {/* Forward Message Dialog */}
      <ForwardMessageModal
        message={message}
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        onForwarded={onMessageUpdated}
      />

      {/* Translation Display */}
      {translation && (
        <div className="mt-2 p-2 bg-muted rounded text-sm italic border-l-2 border-primary">
          {translation}
        </div>
      )}
    </>
  );
};