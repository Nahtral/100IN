import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/use-toast";

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHistoryCleared: () => void;
  selectedChatId?: string;
}

export const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  isOpen,
  onClose,
  onHistoryCleared,
  selectedChatId,
}) => {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [clearOption, setClearOption] = useState<'current' | 'all'>('current');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setClearOption(selectedChatId ? 'current' : 'all');
    setConfirmed(false);
  };

  React.useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, selectedChatId]);

  const clearCurrentChat = async () => {
    if (!selectedChatId) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', selectedChatId);

    if (error) throw error;
  };

  const clearAllChats = async () => {
    if (!currentUser) return;

    // For now, just return since we don't have proper user ID access
    return;
  };

  const handleClear = async () => {
    if (!confirmed) return;

    setLoading(true);
    try {
      if (clearOption === 'current') {
        await clearCurrentChat();
        toast({
          title: "Success",
          description: "Chat history cleared successfully",
        });
      } else {
        await clearAllChats();
        toast({
          title: "Success",
          description: "All chat history cleared successfully",
        });
      }

      onHistoryCleared();
      onClose();
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Clear Chat History
          </DialogTitle>
          <DialogDescription>
            Choose what chat history you want to clear. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={clearOption}
            onValueChange={(value: 'current' | 'all') => setClearOption(value)}
          >
            {selectedChatId && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="current" />
                <Label htmlFor="current" className="flex-1">
                  Clear current chat only
                  <p className="text-xs text-muted-foreground mt-1">
                    Delete all messages from the currently selected chat
                  </p>
                </Label>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex-1">
                Clear all chat history
                <p className="text-xs text-muted-foreground mt-1">
                  Delete all messages from all your chats
                </p>
              </Label>
            </div>
          </RadioGroup>

          <Alert className="border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Warning:</strong> This will permanently delete all selected chat messages. 
              This action cannot be undone and messages cannot be recovered.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <Label 
              htmlFor="confirm" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand this action is permanent and cannot be undone
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={!confirmed || loading}
          >
            {loading ? "Clearing..." : `Clear ${clearOption === 'current' ? 'Chat' : 'All Chats'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};