import React from 'react';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { OptimisticMessage } from '@/hooks/useOptimisticMessages';

interface MessageListProps {
  messages: OptimisticMessage[];
  currentUserId?: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onArchiveMessage: (messageId: string) => void;
  onRecallMessage: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  onEditMessage,
  onDeleteMessage,
  onArchiveMessage,
  onRecallMessage,
  onLoadMore = () => {},
  hasMore = false,
  loadingMore = false,
}) => {
  return (
    <VirtualizedMessageList
      messages={messages}
      currentUserId={currentUserId}
      onAddReaction={onAddReaction}
      onRemoveReaction={onRemoveReaction}
      onEditMessage={onEditMessage}
      onDeleteMessage={onDeleteMessage}
      onArchiveMessage={onArchiveMessage}
      onRecallMessage={onRecallMessage}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      loadingMore={loadingMore}
    />
  );
};