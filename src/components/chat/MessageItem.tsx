import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy,
  Reply,
  Smile,
  Check,
  CheckCheck,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { MessageReactions } from './MessageReactions';
import { Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (reactionId: string) => Promise<void>;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isGroupStart,
  isGroupEnd,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const [showActions, setShowActions] = React.useState(false);

  const isOwnMessage = message.sender_id === user?.id;
  const isFailedMessage = message._failed || message.delivery_status === 'failed';
  const isPendingMessage = message._pending || message.delivery_status === 'sending';

  const handleEditSave = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getDeliveryStatusIcon = () => {
    switch (message.delivery_status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const renderMessageContent = () => {

    if (message.is_recalled) {
      return (
        <span className="italic text-muted-foreground">
          This message was recalled
        </span>
      );
    }

    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Shared image"
                className="max-w-sm rounded-lg"
                loading="lazy"
              />
            )}
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <video
                src={message.media_url}
                controls
                className="max-w-sm rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            )}
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center gap-2 p-2 border rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">{message.content}</p>
              {message.media_size && (
                <p className="text-xs text-muted-foreground">
                  {(message.media_size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
            {message.media_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={message.media_url} download>
                  Download
                </a>
              </Button>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="space-y-2">
            <div className="text-sm">📍 Location shared</div>
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'link':
        return (
          <div className="space-y-2">
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {message.media_url}
            </a>
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-3 hover:bg-accent/30 p-2 rounded-lg transition-colors",
        isOwnMessage && "flex-row-reverse",
        (isPendingMessage || isFailedMessage) && "opacity-70"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar - only show for group start and not own messages */}
      <div className="flex-shrink-0">
        {isGroupStart && !isOwnMessage ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {message.sender_profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Message content */}
      <div className={cn(
        "flex-1 min-w-0",
        isOwnMessage && "flex flex-col items-end"
      )}>
        {/* Sender name and timestamp - only for group start */}
        {isGroupStart && !isOwnMessage && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">
              {message.sender_profile?.full_name || 'Unknown User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className={cn(
          "relative max-w-lg",
          isOwnMessage ? "ml-auto" : "mr-auto"
        )}>
          <div className={cn(
            "px-3 py-2 rounded-lg",
            isOwnMessage 
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
            isFailedMessage && "border border-destructive"
          )}>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditSave}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              renderMessageContent()
            )}

            {/* Edit indicator */}
            {message.is_edited && !isEditing && (
              <span className="text-xs opacity-70 ml-2">
                (edited)
              </span>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onRemoveReaction={onRemoveReaction}
              currentUserId={user?.id}
            />
          )}

          {/* Message actions */}
          {showActions && !isEditing && !message.is_recalled && (
            <div className={cn(
              "absolute top-0 flex items-center gap-1 -mt-4",
              isOwnMessage ? "right-0" : "left-0"
            )}>
              <div className="bg-background border rounded-lg shadow-sm flex">
                {/* Reaction picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Smile className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="flex gap-1">
                      {['👍', '❤️', '😄', '😮', '😢', '😡'].map(emoji => (
                        <Button
                          key={emoji}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => onAddReaction(message.id, emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* More actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
                    <DropdownMenuItem onClick={copyToClipboard}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Reply className="mr-2 h-4 w-4" />
                      Reply
                    </DropdownMenuItem>
                    {isOwnMessage && (
                      <>
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(message.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* Delivery status and timestamp for own messages */}
        {isOwnMessage && isGroupEnd && (
          <div className="flex items-center gap-1 mt-1">
            {getDeliveryStatusIcon()}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Failed message retry */}
        {isFailedMessage && (
          <div className="mt-1">
            <Badge variant="destructive" className="text-xs">
              Failed to send
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};