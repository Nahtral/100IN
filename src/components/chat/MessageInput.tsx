import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
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
          
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={uploading}
            />
          </div>
          
          <Button
            onClick={handleSend}
            disabled={!message.trim() || uploading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {uploading && (
          <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
        )}
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