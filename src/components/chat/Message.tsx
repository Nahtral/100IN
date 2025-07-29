import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Smile, Download, ExternalLink, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MessageProps {
  message: any;
  isOwn: boolean;
  showAvatar: boolean;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  currentUserId?: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const Message: React.FC<MessageProps> = ({
  message,
  isOwn,
  showAvatar,
  onAddReaction,
  onRemoveReaction,
  currentUserId,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    const existingReaction = message.message_reactions?.find(
      (r: any) => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existingReaction) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const renderMediaContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="relative">
            <img
              src={message.media_url}
              alt="Shared image"
              className="max-w-xs rounded-lg"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => window.open(message.media_url, '_blank')}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      case 'video':
        return (
          <div className="relative">
            <video
              src={message.media_url}
              controls
              className="max-w-xs rounded-lg"
            />
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg max-w-xs">
            <Download className="h-5 w-5" />
            <div>
              <p className="font-medium">File attachment</p>
              <p className="text-sm text-muted-foreground">
                {message.media_size ? `${Math.round(message.media_size / 1024)} KB` : 'Unknown size'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(message.media_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        );
      case 'link':
        return (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg max-w-xs">
            <ExternalLink className="h-5 w-5" />
            <div>
              <p className="font-medium">Link</p>
              <a
                href={message.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {message.content}
              </a>
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg max-w-xs">
            <MapPin className="h-5 w-5" />
            <div>
              <p className="font-medium">Location</p>
              <p className="text-sm text-muted-foreground">{message.content}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const groupedReactions = message.message_reactions?.reduce((acc: any, reaction: any) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {}) || {};

  return (
    <div className={cn(
      "flex gap-3 group",
      isOwn && "flex-row-reverse"
    )}>
      {showAvatar && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {message.profiles?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "flex-1 max-w-md",
        !showAvatar && "ml-11",
        isOwn && !showAvatar && "mr-11 ml-0"
      )}>
        {showAvatar && (
          <div className={cn(
            "flex items-center gap-2 mb-1",
            isOwn && "flex-row-reverse"
          )}>
            <span className="text-sm font-medium">
              {message.profiles?.full_name || 'Unknown User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
        )}
        
        <div className={cn(
          "relative group",
          isOwn && "flex justify-end"
        )}>
          <div className={cn(
            "rounded-lg px-3 py-2 max-w-full",
            isOwn 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-foreground"
          )}>
            {message.message_type === 'text' ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div>
                {renderMediaContent()}
                {message.content && (
                  <p className="text-sm mt-2">{message.content}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 ml-2">
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Smile className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Reply</DropdownMenuItem>
                  {isOwn && (
                    <>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, reactions]: [string, any[]]) => (
              <Button
                key={emoji}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji} {reactions.length}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};