import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EventImageUploadProps {
  eventId: string;
  currentImageUrl?: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
  className?: string;
}

const EventImageUpload: React.FC<EventImageUploadProps> = ({
  eventId,
  currentImageUrl,
  onImageUpdate,
  className = ""
}) => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old image if it exists
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('event-images').remove([oldPath]);
        }
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-${Math.random()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      // Update event record
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ image_url: publicUrl })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setImageUrl(publicUrl);
      onImageUpdate(publicUrl);

      toast({
        title: "Success",
        description: "Event image updated successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      // Delete from storage
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('event-images').remove([fileName]);
      }

      // Update event record
      const { error } = await supabase
        .from('schedules')
        .update({ image_url: null })
        .eq('id', eventId);

      if (error) throw error;

      setImageUrl(null);
      onImageUpdate(null);

      toast({
        title: "Success",
        description: "Event image removed successfully",
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Error",
        description: "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {imageUrl ? (
        <Card className="relative group overflow-hidden">
          <img
            src={imageUrl}
            alt="Event"
            className="w-full h-32 sm:h-24 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              Replace
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
          <Button
            variant="ghost"
            className="w-full h-24 sm:h-16 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Add event image
                </span>
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
};

export default EventImageUpload;