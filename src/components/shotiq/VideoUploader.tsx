import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, X, Play, Pause } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoUploaderProps {
  playerId: string;
  onVideoUploaded?: (videoData: {
    url: string;
    filename: string;
    duration?: number;
  }) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  playerId,
  onVideoUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video file smaller than 100MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const uploadVideo = async () => {
    if (!selectedFile || !playerId) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = new Date().toISOString();
      const fileName = `${playerId}/${timestamp}-${selectedFile.name}`;

      // Upload to Supabase Storage with progress simulation
      const { data, error } = await supabase.storage
        .from('shot-videos')
        .upload(fileName, selectedFile);
      
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('shot-videos')
        .getPublicUrl(data.path);

      const videoData = {
        url: urlData.publicUrl,
        filename: selectedFile.name,
        duration: videoDuration || undefined,
      };

      onVideoUploaded?.(videoData);

      toast({
        title: "Video uploaded successfully",
        description: "Your video is ready for analysis",
      });

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsPlaying(false);
      setVideoDuration(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setIsPlaying(false);
    setVideoDuration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Shot Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Upload your shot video</p>
              <p className="text-sm text-muted-foreground mb-4">
                Select a video file to analyze your basketball shot technique
              </p>
              <Button variant="outline">
                Choose Video File
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Supported formats: MP4, MOV, AVI, WebM</p>
              <p>• Maximum file size: 100MB</p>
              <p>• For best results, record shots from the side view</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={previewUrl || undefined}
                className="w-full h-64 object-contain"
                onLoadedMetadata={handleVideoLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={togglePlayPause}
                  className="bg-black/50 hover:bg-black/70"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
              </div>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={removeSelectedFile}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{selectedFile.name}</span>
              <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
            
            {videoDuration && (
              <div className="text-sm text-muted-foreground">
                Duration: {Math.round(videoDuration)}s
              </div>
            )}
            
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={uploadVideo}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : 'Upload & Analyze'}
              </Button>
              <Button
                variant="outline"
                onClick={removeSelectedFile}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};