import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Calendar, User } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  sender_name: string;
  chat_name: string;
  chat_id: string;
  message_type: string;
}

interface SearchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
}

export const SearchHistoryModal: React.FC<SearchHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectChat,
}) => {
  const { currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const performSearch = async () => {
    if (!searchQuery.trim() || !currentUser) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // First get all chat IDs that the user participates in
      // For now, just return empty results since we don't have proper user ID access
      setResults([]);
      setLoading(false);
      return;
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectChat(result.chat_id);
    onClose();
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="bg-primary/20 text-primary">{part}</mark> : 
        part
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Chat History</DialogTitle>
          <DialogDescription>
            Search through all your chat messages and conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={performSearch}
              disabled={!searchQuery.trim() || loading}
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px]">
            {hasSearched && (
              <div className="space-y-3">
                {results.length > 0 ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Found {results.length} result{results.length !== 1 ? 's' : ''}
                    </div>
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectResult(result)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{result.chat_name}</span>
                            {result.message_type !== 'text' && (
                              <Badge variant="secondary" className="text-xs">
                                {result.message_type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {result.sender_name}
                        </div>
                        
                        <div className="text-sm line-clamp-2">
                          {highlightText(result.content, searchQuery)}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages found for "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try different keywords or check spelling</p>
                  </div>
                )}
              </div>
            )}

            {!hasSearched && (
              <div className="text-center text-muted-foreground py-8">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Enter a search term to find messages</p>
                <p className="text-xs mt-1">Search through all your chat history</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};