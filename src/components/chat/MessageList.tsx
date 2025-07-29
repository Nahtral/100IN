import React from 'react';
import { Message } from './Message';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: any[];
  currentUserId?: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}) => {
  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
            showAvatar={
              index === 0 ||
              messages[index - 1].sender_id !== message.sender_id
            }
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </ScrollArea>
  );
};