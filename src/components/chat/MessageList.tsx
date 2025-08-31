import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { Message, TypingIndicator as TypingType } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  typingUsers: TypingType[];
  onLoadMore: () => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (reactionId: string) => Promise<void>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  hasMore,
  typingUsers,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const [isNearBottom, setIsNearBottom] = React.useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isNearBottom && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isNearBottom]);

  // Handle scroll events
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollToBottom(!nearBottom);

    // Load more messages when scrolled to top
    if (scrollTop === 0 && hasMore && !loading) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    messages.forEach(message => {
      const messageDate = new Date(message.sent_at).toDateString();
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <div className="relative h-full">
      <ScrollArea
        ref={scrollAreaRef}
        className="h-full"
        onScrollCapture={handleScroll}
      >
        <div className="p-4 space-y-4">
          {/* Load more indicator */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Load older messages'
                )}
              </Button>
            </div>
          )}

          {/* Messages grouped by date */}
          {groupedMessages.map((group, groupIndex) => (
            <div key={group.date} className="space-y-4">
              {/* Date separator */}
              <div className="flex items-center justify-center">
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDateHeader(group.date)}
                  </span>
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {group.messages.map((message, index) => {
                  const prevMessage = index > 0 ? group.messages[index - 1] : null;
                  const nextMessage = index < group.messages.length - 1 ? group.messages[index + 1] : null;
                  
                  // Group consecutive messages from same sender
                  const isGroupStart = !prevMessage || prevMessage.sender_id !== message.sender_id;
                  const isGroupEnd = !nextMessage || nextMessage.sender_id !== message.sender_id;

                  return (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isGroupStart={isGroupStart}
                      isGroupEnd={isGroupEnd}
                      onEdit={onEditMessage}
                      onDelete={onDeleteMessage}
                      onAddReaction={onAddReaction}
                      onRemoveReaction={onRemoveReaction}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground text-center">
                No messages yet. Start the conversation!
              </p>
            </div>
          )}

          {/* Bottom anchor */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          size="sm"
          className={cn(
            "absolute bottom-4 right-4 rounded-full shadow-lg",
            "animate-in slide-in-from-bottom-2"
          )}
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};