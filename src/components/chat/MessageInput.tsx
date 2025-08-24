import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Paperclip, 
  Image, 
  Video, 
  MapPin, 
  Link,
  File 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: string, mediaUrl?: string, mediaType?: string, mediaSize?: number) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file: File, messageType: string) => {
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${messageType}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      onSendMessage('', messageType, publicUrl, file.type, file.size);
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentClick = (type: string) => {
    if (type === 'location') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const locationString = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            onSendMessage(locationString, 'location');
          },
          (error) => {
            toast({
              title: "Error",
              description: "Failed to get location",
              variant: "destructive",
            });
          }
        );
      }
    } else if (type === 'link') {
      const url = prompt('Enter URL:');
      if (url) {
        onSendMessage(url, 'link');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <div className="border-t border-border bg-background">
        {/* Text Preview Area - Shows what's being typed on mobile */}
        {message.trim() && (
          <div className="px-4 pt-3 pb-2 border-b border-border/50">
            <div className="bg-muted/30 rounded-lg p-3 max-h-24 overflow-y-auto">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {message}
              </p>
            </div>
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  className="shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleAttachmentClick('image')}>
                  <Image className="h-4 w-4 mr-2" />
                  Photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAttachmentClick('video')}>
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAttachmentClick('file')}>
                  <File className="h-4 w-4 mr-2" />
                  File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAttachmentClick('location')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAttachmentClick('link')}>
                  <Link className="h-4 w-4 mr-2" />
                  Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex-1 min-w-0">
              {/* Use Textarea for better mobile experience */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={uploading}
                className="min-h-[44px] max-h-32 resize-none rounded-full border-2 px-4 py-3 text-base leading-5 
                           focus:border-primary focus:ring-0 bg-muted/50 
                           placeholder:text-muted-foreground/70
                           md:text-sm md:leading-4"
                rows={1}
              />
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!message.trim() || uploading}
              size="sm"
              className="shrink-0 h-11 w-11 rounded-full bg-primary hover:bg-primary/90 
                         disabled:bg-muted disabled:text-muted-foreground"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
          {uploading && (
            <div className="flex items-center gap-2 mt-3 px-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            let messageType = 'file';
            if (file.type.startsWith('image/')) messageType = 'image';
            else if (file.type.startsWith('video/')) messageType = 'video';
            
            handleFileUpload(file, messageType);
          }
        }}
      />
    </>
  );
};