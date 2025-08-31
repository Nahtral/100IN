import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TypingIndicator as TypingType } from '@/types/chat';

interface TypingIndicatorProps {
  users: TypingType[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (users.length === 1) {
      return 'is typing...';
    } else if (users.length === 2) {
      return 'are typing...';
    } else {
      return `and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 text-muted-foreground">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-xs">
          {users[0]?.user_id?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex items-center gap-2">
        <span className="text-sm">{getTypingText()}</span>
        
        {/* Animated dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};