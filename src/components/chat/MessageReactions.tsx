import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageReaction } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onRemoveReaction: (reactionId: string) => void;
  currentUserId?: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onRemoveReaction,
  currentUserId
}) => {
  // Group reactions by emoji
  const groupedReactions = React.useMemo(() => {
    const groups: Record<string, { count: number; hasUserReacted: boolean; reactionId?: string }> = {};
    
    reactions.forEach(reaction => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = {
          count: 0,
          hasUserReacted: false,
          reactionId: undefined
        };
      }
      
      groups[reaction.emoji].count++;
      
      if (reaction.user_id === currentUserId) {
        groups[reaction.emoji].hasUserReacted = true;
        groups[reaction.emoji].reactionId = reaction.id;
      }
    });
    
    return groups;
  }, [reactions, currentUserId]);

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, data]) => (
        <Button
          key={emoji}
          size="sm"
          variant="outline"
          className={cn(
            "h-6 px-2 text-xs",
            data.hasUserReacted && "bg-primary/10 border-primary"
          )}
          onClick={() => {
            if (data.hasUserReacted && data.reactionId) {
              onRemoveReaction(data.reactionId);
            }
          }}
        >
          <span className="mr-1">{emoji}</span>
          <span>{data.count}</span>
        </Button>
      ))}
    </div>
  );
};