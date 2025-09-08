import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface RenameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => Promise<void>;
  currentTitle: string;
  chatType: string;
}

export const RenameChatModal = ({ 
  isOpen, 
  onClose, 
  onRename, 
  currentTitle,
  chatType 
}: RenameChatModalProps) => {
  const [title, setTitle] = useState(currentTitle);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    
    if (trimmedTitle.length < 2) {
      toast({
        variant: "destructive",
        title: "Invalid title",
        description: "Chat title must be at least 2 characters long"
      });
      return;
    }

    if (trimmedTitle.length > 60) {
      toast({
        variant: "destructive",
        title: "Invalid title", 
        description: "Chat title must be less than 60 characters long"
      });
      return;
    }

    if (trimmedTitle === currentTitle) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await onRename(trimmedTitle);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !loading) {
      onClose();
    }
  };

  // Reset title when modal opens
  const handleOpenChangeInternal = (open: boolean) => {
    if (open) {
      setTitle(currentTitle);
    }
    handleOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChangeInternal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {chatType === 'group' ? 'Group' : 'Chat'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Chat Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter chat name..."
              disabled={loading}
              maxLength={60}
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              {title.length}/60 characters
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || title.trim().length < 2 || title.trim() === currentTitle}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};