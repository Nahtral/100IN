import React, { useState, useRef, useEffect } from 'react';
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
  Video,
  X
} from 'lucide-react';
import { ChatHeaderMenu } from './ChatHeaderMenu';
import { MessageBubbleMenu } from './MessageBubbleMenu';
import { Chat, ChatMessage, ChatError } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface EnhancedProductionChatWindowProps {
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

export const EnhancedProductionChatWindow: React.FC<EnhancedProductionChatWindowProps> = ({
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
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    lastMessageCount.current = messages.length;
  }, [messages.length]);

  // Mark as read when viewing messages
  useEffect(() => {
    if (chat && messages.length > 0) {
      const timer = setTimeout(onMarkAsRead, 1000);
      return () => clearTimeout(timer);
    }
  }, [chat, messages.length, onMarkAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    let content = messageText.trim();
    
    // Add reply prefix if replying
    if (replyTo) {
      content = `@${replyTo.sender_name}: ${content}`;
    }

    setMessageText('');
    setReplyTo(null);
    setSending(true);

    try {
      await onSendMessage(content);
    } catch (error) {
      // Error handling is done in the hook
      setMessageText(messageText); // Restore message on error
      if (replyTo) setReplyTo(replyTo); // Restore reply state
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
    if (chat.name && chat.name !== 'Chat' && chat.name !== 'Direct Chat') return chat.name;
    if (chat.chat_type === 'private') {
      return chat.participant_count === 2 ? 'Direct Message' : 'Private Chat';
    }
    return chat.chat_type === 'group' ? 'Group Chat' : 'Team Chat';
  };

  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
  };

  const handleDeleteForMe = (messageId: string) => {
    setHiddenMessages(prev => new Set([...prev, messageId]));
  };

  const MessageItem = ({ message }: { message: ChatMessage }) => {
    const isOwnMessage = message.sender_id === user?.id;
    const isHidden = hiddenMessages.has(message.id);
    const isRecalled = message.status === 'recalled';
    
    if (isHidden) return null;

    return (
      <div className={cn(
        "group flex gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50",
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
            {message.edited_at && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            {message._pending && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {message._failed && (
              <AlertCircle className="h-3 w-3 text-destructive" />
            )}
            <div className="ml-auto">
              <MessageBubbleMenu
                message={message}
                isOwner={isOwnMessage}
                onReply={handleReply}
                onMessageUpdated={onRefresh}
                onDeleteForMe={handleDeleteForMe}
              />
            </div>
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {isRecalled ? (
              <span className="italic opacity-60">🚫 This message was recalled</span>
            ) : (
              message.content
            )}
          </div>
          {message.attachment_url && !isRecalled && (
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
  };

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
          <ChatHeaderMenu 
            chat={chat} 
            onChatUpdated={onRefresh}
            isSuperAdmin={false} // TODO: Get from user context
          />
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
        {replyTo && (
          <div className="mb-3 p-3 bg-muted rounded-lg border-l-4 border-primary">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Replying to {replyTo.sender_name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="h-5 w-5 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm line-clamp-1 text-foreground">
              {replyTo.content}
            </p>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button type="button" size="sm" variant="ghost">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.sender_name}...` : "Type a message..."}
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