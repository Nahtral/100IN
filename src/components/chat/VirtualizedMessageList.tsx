import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Message } from './Message';
import { OptimisticMessage } from '@/hooks/useOptimisticMessages';
import { Button } from '@/components/ui/button';
import { ArrowDown, Loader2 } from 'lucide-react';

interface VirtualizedMessageListProps {
  messages: OptimisticMessage[];
  currentUserId?: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onArchiveMessage: (messageId: string) => void;
  onRecallMessage: (messageId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

const ITEM_HEIGHT = 80; // Estimated height per message
const OVERSCAN = 5; // Number of items to render outside viewport

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  onEditMessage,
  onDeleteMessage,
  onArchiveMessage,
  onRecallMessage,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastMessageCount = useRef(messages.length);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    messages.length - 1,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  const visibleMessages = messages.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);

    // Check if at top for loading more
    if (newScrollTop < 100 && hasMore && !loadingMore) {
      onLoadMore();
    }

    // Check if should show scroll to bottom button
    const isNearBottom = 
      target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollToBottom(!isNearBottom);

    // Disable auto-scroll if user scrolls up
    if (newScrollTop < target.scrollHeight - target.clientHeight - 100) {
      setAutoScroll(false);
    } else {
      setAutoScroll(true);
    }
  }, [hasMore, loadingMore, onLoadMore]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messages.length > lastMessageCount.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    lastMessageCount.current = messages.length;
  }, [messages.length, autoScroll]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center p-4 border-b border-border">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading older messages...</span>
        </div>
      )}

      {/* Virtual scrolling container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4"
        onScroll={handleScroll}
        style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
      >
        {/* Top spacer */}
        <div style={{ height: startIndex * ITEM_HEIGHT }} />

        {/* Visible messages */}
        <div className="space-y-4">
          {visibleMessages.map((message, index) => {
            const actualIndex = startIndex + index;
            const showAvatar = 
              actualIndex === 0 ||
              messages[actualIndex - 1]?.sender_id !== message.sender_id;

            return (
              <div
                key={message.id}
                style={{ minHeight: ITEM_HEIGHT }}
                className={`${
                  message._optimistic ? 'opacity-70' : ''
                } ${
                  message._pending ? 'animate-pulse' : ''
                } ${
                  message._failed ? 'border-l-4 border-destructive pl-4' : ''
                }`}
              >
                <Message
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                  showAvatar={showAvatar}
                  onAddReaction={onAddReaction}
                  onRemoveReaction={onRemoveReaction}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onArchiveMessage={onArchiveMessage}
                  onRecallMessage={onRecallMessage}
                  currentUserId={currentUserId}
                />
                {message._failed && (
                  <div className="text-xs text-destructive mt-1">
                    Failed to send. Check your connection.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom spacer */}
        <div style={{ height: (messages.length - endIndex - 1) * ITEM_HEIGHT }} />

        {/* Scroll anchor for auto-scroll */}
        <div id="messages-end" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          onClick={scrollToBottom}
          size="sm"
          className="absolute bottom-4 right-4 rounded-full h-10 w-10 p-0 shadow-lg"
          variant="secondary"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Load more trigger zone */}
      {hasMore && (
        <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none" />
      )}
    </div>
  );
};