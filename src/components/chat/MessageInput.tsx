import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Paperclip, 
  Image, 
  Video, 
  MapPin, 
  Link,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, mediaUrl?: string) => Promise<void>;
  onTyping: (typing: boolean) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping
}) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;

    const content = message.trim();
    setMessage('');
    onTyping(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    // Handle typing indicator
    onTyping(value.length > 0);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  const handleFileUpload = async (file: File, type: string) => {
    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      await onSendMessage(file.name, type, publicUrl);

      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload file"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentClick = (type: string) => {
    if (type === 'location') {
      handleLocationShare();
    } else if (type === 'link') {
      handleLinkShare();
    } else {
      // Trigger file input
      if (fileInputRef.current) {
        fileInputRef.current.accept = type === 'image' ? 'image/*' : 
                                     type === 'video' ? 'video/*' : '*/*';
        fileInputRef.current.setAttribute('data-type', type);
        fileInputRef.current.click();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = e.target.getAttribute('data-type') || 'file';
    
    if (file) {
      handleFileUpload(file, type);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleLocationShare = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const locationText = `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          await onSendMessage(locationText, 'location');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to get location"
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Geolocation is not supported"
      });
    }
  };

  const handleLinkShare = () => {
    const url = prompt('Enter URL to share:');
    if (url) {
      onSendMessage('', 'link', url);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-end gap-2">
        {/* Attachment menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start">
            <DropdownMenuItem onClick={() => handleAttachmentClick('image')}>
              <Image className="mr-2 h-4 w-4" />
              Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAttachmentClick('video')}>
              <Video className="mr-2 h-4 w-4" />
              Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAttachmentClick('file')}>
              <Paperclip className="mr-2 h-4 w-4" />
              File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAttachmentClick('location')}>
              <MapPin className="mr-2 h-4 w-4" />
              Location
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAttachmentClick('link')}>
              <Link className="mr-2 h-4 w-4" />
              Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className={cn(
              "resize-none min-h-[40px] max-h-[120px] pr-12",
              "border-0 shadow-none focus-visible:ring-0",
              "bg-muted rounded-lg"
            )}
            rows={1}
          />
          
          {/* Send button */}
          <Button
            size="sm"
            className="absolute right-2 bottom-2 h-6 w-6 p-0"
            onClick={handleSend}
            disabled={!message.trim() || uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload indicator */}
      {uploading && (
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}
    </div>
  );
};