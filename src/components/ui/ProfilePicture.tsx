import React, { useState, useRef } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePictureProps {
  avatarUrl?: string | null;
  userName: string;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({ 
  avatarUrl, 
  userName, 
  onAvatarUpdate 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload an avatar.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true // Replace existing file
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Call the callback to update parent component
      onAvatarUpdate?.(urlData.publicUrl);

      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });

      setShowModal(false);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    uploadAvatar(file);
  };

  const handleClick = () => {
    if (user) {
      setShowModal(true);
    }
  };

  return (
    <>
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative group"
        onClick={handleClick}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${userName}'s avatar`}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {getInitials(userName)}
            </span>
          </div>
        )}
        
        {/* Hover overlay */}
        {user && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${userName}'s avatar`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-medium">
                      {getInitials(userName)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Click below to upload a new profile picture
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 btn-panthers"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePicture;