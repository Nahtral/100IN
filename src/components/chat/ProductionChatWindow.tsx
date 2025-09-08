import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Send, 
  Paperclip,
  Loader2,
  AlertCircle,
  Users,
  Phone,
  Video
} from 'lucide-react';
import { Chat, ChatMessage, ChatError } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ProductionChatWindowProps {
  chat: Chat | null;
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  error: ChatError | null;
  onSendMessage: (content: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onBack?: () => void;
  onMarkAsRead: () => void;
  onRetry: (operation: string) => Promise<void>;
}

export const ProductionChatWindow: React.FC<ProductionChatWindowProps> = ({
  chat,
  messages,
  loading,
  hasMore,
  error,
  onSendMessage,
  onLoadMore,
  onRefresh,
  onBack,
  onMarkAsRead,
  onRetry
}) => {
  const [messageText, setMessageText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const lastMessageCount = React.useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    lastMessageCount.current = messages.length;
  }, [messages.length]);

  // Mark as read when viewing messages
  React.useEffect(() => {
    if (chat && messages.length > 0) {
      const timer = setTimeout(onMarkAsRead, 1000);
      return () => clearTimeout(timer);
    }
  }, [chat, messages.length, onMarkAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      await onSendMessage(content);
    } catch (error) {
      // Error handling is done in the hook
      setMessageText(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = async () => {
    if (hasMore && !loading) {
      await onLoadMore();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name && chat.name !== 'Chat') return chat.name;
    if (chat.chat_type === 'private') {
      return chat.participant_count === 2 ? 'Direct Message' : 'Private Chat';
    }
    return chat.chat_type === 'group' ? 'Group Chat' : 'Team Chat';
  };

  const MessageItem = ({ message }: { message: ChatMessage }) => (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg transition-colors",
      message._failed && "bg-destructive/10",
      message._pending && "opacity-70"
    )}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
        {message.sender_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-foreground">
            {message.sender_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {message._pending && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {message._failed && (
            <AlertCircle className="h-3 w-3 text-destructive" />
          )}
        </div>
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {message.attachment_url && (
          <div className="mt-2">
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
            >
              <Paperclip className="h-4 w-4" />
              {message.attachment_name || 'Attachment'}
            </a>
          </div>
        )}
      </div>
    </div>
  );

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="max-w-md">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-muted-foreground">
            Choose a conversation from the sidebar or create a new chat to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button size="sm" variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {getChatDisplayName(chat)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {chat.participant_count} {chat.participant_count === 1 ? 'member' : 'members'}
              {chat.last_message_at && ` • Active ${formatMessageTime(chat.last_message_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error.code}: {error.message}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry('load_messages')}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-2">
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  'Load older messages'
                )}
              </Button>
            </div>
          )}

          {messages.length === 0 && !loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button type="button" size="sm" variant="ghost">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};