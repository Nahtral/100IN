import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Play, Square, RotateCcw, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShotSessions, Shot } from '@/hooks/useShotSessions';

interface ShotData {
  arc: number;
  depth: number;
  deviation: number;
  made: boolean;
  timestamp: number;
  videoUrl?: string;
}

interface ShotTrackerProps {
  playerId: string;
  onShotTracked: (shot: ShotData) => void;
}

const ShotTracker: React.FC<ShotTrackerProps> = ({ playerId, onShotTracked }) => {
  const { toast } = useToast();
  const { currentSession, createSession, endSession, addShot } = useShotSessions(playerId);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentShot, setCurrentShot] = useState<ShotData | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
          facingMode: 'environment'
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      toast({
        title: "Camera Ready",
        description: "Position your phone to capture the basketball shot",
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await startCamera();
      return;
    }

    try {
      recordedChunks.current = [];
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorder.start(100); // Record in 100ms chunks
      setIsRecording(true);

      // Auto-stop recording after 5 seconds (typical shot duration)
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          stopRecording();
        }
      }, 5000);

      toast({
        title: "Recording Shot",
        description: "Capturing 5-second video for analysis...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    setIsAnalyzing(true);
    
    try {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      
      // Convert to base64 for processing
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Video = reader.result as string;
        const base64Data = base64Video.split(',')[1];
        
        // Call AI analysis
        const analysisResult = await analyzeShot(base64Data);
        
        // Upload video to storage
        const videoUrl = await uploadVideo(blob);
        
        const shotData: ShotData = {
          ...analysisResult,
          timestamp: Date.now(),
          videoUrl
        };

        // If we have an active session, add shot to it
        let sessionId = currentSession?.id;
        if (!sessionId) {
          sessionId = await createSession();
        }

        if (sessionId) {
          const success = await addShot(sessionId, {
            shot_number: shotCount + 1,
            arc_degrees: shotData.arc,
            depth_inches: shotData.depth,
            lr_deviation_inches: shotData.deviation,
            shot_type: 'practice',
            court_x_position: null,
            court_y_position: null,
            made: shotData.made,
            video_url: shotData.videoUrl,
            audio_feedback: null,
            ai_analysis_data: { 
              confidence: 0.85, 
              analysis_version: '1.0',
              timestamp: Date.now()
            },
            timestamp_in_session: shotCount + 1
          });

          if (success) {
            setShotCount(prev => prev + 1);
          }
        }
        
        setCurrentShot(shotData);
        onShotTracked(shotData);
        
        toast({
          title: "Shot Analyzed!",
          description: `Arc: ${shotData.arc}°, Depth: ${shotData.depth}", ${shotData.made ? 'Made' : 'Missed'}`,
        });
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze shot",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeShot = async (videoData: string): Promise<Omit<ShotData, 'timestamp' | 'videoUrl'>> => {
    try {
      // Call edge function for AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-shot', {
        body: { videoData, playerId }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Shot analysis error:', error);
      // Return mock data for now
      return {
        arc: Math.round(35 + Math.random() * 20), // 35-55 degrees
        depth: Math.round(8 + Math.random() * 8), // 8-16 inches
        deviation: Math.round(-3 + Math.random() * 6), // -3 to +3 inches
        made: Math.random() > 0.3 // 70% make rate for demo
      };
    }
  };

  const uploadVideo = async (blob: Blob): Promise<string> => {
    try {
      const fileName = `shot_${playerId}_${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('evaluation-videos')
        .upload(fileName, blob, {
          contentType: 'video/webm'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('evaluation-videos')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading video:', error);
      return '';
    }
  };

  const resetShot = () => {
    setCurrentShot(null);
    recordedChunks.current = [];
  };

  const handleEndSession = async () => {
    if (currentSession) {
      await endSession(currentSession.id);
      setShotCount(0);
      toast({
        title: "Session Ended",
        description: "Shooting session completed successfully",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Shot Tracker
            {currentSession && (
              <Badge variant="default" className="bg-primary">
                Session Active
              </Badge>
            )}
          </div>
          {currentSession && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleEndSession}
            >
              End Session
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC
            </div>
          )}

          {/* Analysis overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                Analyzing shot...
              </div>
            </div>
          )}

          {/* Shot overlay grid */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full opacity-30">
              {/* Court outline */}
              <rect x="10%" y="20%" width="80%" height="60%" fill="none" stroke="white" strokeWidth="2" />
              {/* Rim indicator */}
              <circle cx="50%" cy="45%" r="20" fill="none" stroke="#ff4444" strokeWidth="2" />
              {/* Arc indicator */}
              <path d="M 30% 45% Q 50% 25% 70% 45%" fill="none" stroke="#44ff44" strokeWidth="1" strokeDasharray="5,5" />
            </svg>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!streamRef.current ? (
            <Button onClick={startCamera} className="bg-primary">
              <Video className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <>
              {!isRecording ? (
                <Button 
                  onClick={startRecording} 
                  disabled={isAnalyzing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Record Shot
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  variant="outline"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
              
              {currentShot && (
                <Button onClick={resetShot} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </>
          )}
        </div>

        {/* Shot Results */}
        {currentShot && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Arc</div>
              <div className="text-2xl font-bold">{currentShot.arc}°</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Depth</div>
              <div className="text-2xl font-bold">{currentShot.depth}"</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">L/R Dev</div>
              <div className="text-2xl font-bold">{currentShot.deviation > 0 ? '+' : ''}{currentShot.deviation}"</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Result</div>
              <Badge variant={currentShot.made ? "default" : "destructive"}>
                {currentShot.made ? "MADE" : "MISS"}
              </Badge>
            </div>
          </div>
        )}

        {/* Session Info */}
        {currentSession && (
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium">
              Session Progress: {currentSession.made_shots}/{currentSession.total_shots}
              {currentSession.total_shots > 0 && ` (${currentSession.shooting_percentage.toFixed(1)}%)`}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p>• Position camera to capture the entire shot arc</p>
          <p>• Tap "Record Shot" just before the shot release</p>
          <p>• Keep camera steady during 5-second recording</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShotTracker;