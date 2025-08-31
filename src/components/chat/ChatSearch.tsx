import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatSearchProps {
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
}

interface SearchResult {
  id: string;
  content: string;
  sent_at: string;
  sender_name: string;
  chat_id: string;
  chat_name: string;
  chat_type: string;
  message_type: string;
}

export const ChatSearch: React.FC<ChatSearchProps> = ({
  onClose,
  onSelectChat
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  React.useEffect(() => {
    // Reset state when component mounts
    setSearchQuery('');
    setResults([]);
    setHasSearched(false);
  }, []);

  const performSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    try {
      // This is a simplified search - in a real app you'd want full-text search
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sent_at,
          message_type,
          chat_id,
          sender_profile:profiles!messages_sender_id_fkey (
            full_name
          ),
          chats!inner (
            id,
            name,
            chat_type,
            chat_participants!inner (
              user_id
            )
          )
        `)
        .ilike('content', `%${searchQuery}%`)
        .eq('chats.chat_participants.user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const searchResults: SearchResult[] = data.map(item => ({
        id: item.id,
        content: item.content,
        sent_at: item.sent_at,
        sender_name: item.sender_profile?.full_name || 'Unknown',
        chat_id: item.chat_id,
        chat_name: item.chats?.name || 'Chat',
        chat_type: item.chats?.chat_type || 'private',
        message_type: item.message_type
      }));

      setResults(searchResults);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to search messages"
      });
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
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-1">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                autoFocus
              />
            </div>
            <Button
              onClick={performSearch}
              disabled={!searchQuery.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Searching messages...</span>
                </div>
              ) : hasSearched ? (
                results.length > 0 ? (
                  results.map(result => (
                    <div
                      key={result.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSelectResult(result)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {result.chat_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {result.chat_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(result.sent_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {result.sender_name}:
                        </span>
                        <span className="ml-2">
                          {highlightText(result.content, searchQuery)}
                        </span>
                      </div>
                      
                      {result.message_type !== 'text' && (
                        <Badge variant="secondary" className="text-xs mt-2">
                          {result.message_type}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No messages found for "{searchQuery}"
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Enter a search term to find messages
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};