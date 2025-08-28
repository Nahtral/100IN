import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, Play, Pause, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoUploaderProps {
  playerId: string;
  onVideoAnalyzed: (analysisData: any) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  playerId,
  onVideoAnalyzed
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error('Please select a valid video file');
      }
    }
  };

  const uploadVideo = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${playerId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('shot-videos')
      .upload(filePath, file);

    if (error) throw error;

    // Simulate progress for user feedback
    setUploadProgress(100);

    const { data: { publicUrl } } = supabase.storage
      .from('shot-videos')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const analyzeVideo = async (videoUrl: string) => {
    try {
      setAnalyzing(true);
      
      // Call the video analysis edge function
      const { data, error } = await supabase.functions.invoke('analyze-video-technique', {
        body: {
          videoUrl,
          playerId
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Video analysis error:', error);
      throw error;
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Upload video
      const videoUrl = await uploadVideo(selectedFile);
      
      // Analyze video
      const analysisData = await analyzeVideo(videoUrl);

      // Save shot data with video information
      const { error: shotError } = await supabase
        .from('shots')
        .insert({
          player_id: playerId,
          session_id: null,
          shot_number: 1,
          video_url: videoUrl,
          video_filename: selectedFile.name,
          video_analysis_status: 'completed',
          video_analysis_data: analysisData,
          video_duration_seconds: videoRef.current?.duration || null,
          made: analysisData?.made || false,
          arc_degrees: analysisData?.arc_degrees || null,
          depth_inches: analysisData?.depth_inches || null,
          lr_deviation_inches: analysisData?.lr_deviation_inches || null,
          shot_type: analysisData?.shot_type || '2PT',
          created_at: new Date().toISOString()
        });

      if (shotError) throw shotError;

      toast.success('Video uploaded and analyzed successfully!');
      onVideoAnalyzed(analysisData);
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error('Upload and analysis error:', error);
      toast.error('Failed to upload and analyze video');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Upload & Analyze Video</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="video-upload">Select Video File</Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={uploading || analyzing}
            />
          </div>

          {previewUrl && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="w-full max-h-64 object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="absolute bottom-2 left-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={togglePlayPause}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={resetVideo}
                    className="bg-black/50 hover:bg-black/70"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                File: {selectedFile?.name} ({(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
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
              onClick={handleUploadAndAnalyze}
              disabled={!selectedFile || uploading || analyzing}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Upload & Analyze'}
            </Button>
            
            {selectedFile && (
              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={uploading || analyzing}
              >
                Clear
              </Button>
            )}
          </div>

          {analyzing && (
            <div className="text-center text-sm text-muted-foreground">
              AI is analyzing your shot technique... This may take a moment.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};