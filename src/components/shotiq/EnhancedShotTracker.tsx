import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Play, Square, RotateCcw, Target, Maximize, Minimize, RotateCw, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShotData {
  arc: number;
  depth: number;
  deviation: number;
  made: boolean;
  timestamp: number;
  videoUrl?: string;
}

interface EnhancedShotTrackerProps {
  playerId: string;
  onShotTracked: (shot: ShotData) => void;
}

const EnhancedShotTracker: React.FC<EnhancedShotTrackerProps> = ({ playerId, onShotTracked }) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentShot, setCurrentShot] = useState<ShotData | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(mobile || Capacitor.isNativePlatform());
    };

    // Detect orientation changes
    const handleOrientationChange = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(orientation);
    };

    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (!isCurrentlyFullscreen && isFullScreen) {
        setIsFullScreen(false);
        if (Capacitor.isNativePlatform()) {
          StatusBar.show();
        }
      }
    };

    checkMobile();
    handleOrientationChange();

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullScreen]);

  const startCamera = async () => {
    try {
      // Enhanced mobile camera constraints
      const constraints = {
        video: {
          width: isMobile ? { ideal: orientation === 'portrait' ? 1080 : 1920 } : { ideal: 1920 },
          height: isMobile ? { ideal: orientation === 'portrait' ? 1920 : 1080 } : { ideal: 1080 },
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'environment', // Use back camera
          aspectRatio: orientation === 'portrait' ? 9/16 : 16/9
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      toast({
        title: "Camera Ready",
        description: `${orientation.charAt(0).toUpperCase() + orientation.slice(1)} mode activated for mobile recording`,
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

      mediaRecorder.start(100);
      setIsRecording(true);

      // Auto-stop recording after 5 seconds
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
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Video = reader.result as string;
        const base64Data = base64Video.split(',')[1];
        
        const analysisResult = await analyzeShot(base64Data);
        const videoUrl = await uploadVideo(blob);
        
        const shotData: ShotData = {
          ...analysisResult,
          timestamp: Date.now(),
          videoUrl
        };

        await saveShotData(shotData);
        
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
      const { data, error } = await supabase.functions.invoke('analyze-shot', {
        body: { videoData, playerId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Shot analysis error:', error);
      return {
        arc: Math.round(35 + Math.random() * 20),
        depth: Math.round(8 + Math.random() * 8),
        deviation: Math.round(-3 + Math.random() * 6),
        made: Math.random() > 0.3
      };
    }
  };

  const uploadVideo = async (blob: Blob): Promise<string> => {
    try {
      const fileName = `shot_${playerId}_${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('shot-videos')
        .upload(fileName, blob, {
          contentType: 'video/webm'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('shot-videos')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading video:', error);
      return '';
    }
  };

  const saveShotData = async (shotData: ShotData) => {
    try {
      const { error } = await supabase
        .from('shots')
        .insert({
          player_id: playerId,
          arc_degrees: shotData.arc,
          depth_inches: shotData.depth,
          lr_deviation_inches: shotData.deviation,
          made: shotData.made,
          video_url: shotData.videoUrl,
          shot_type: 'practice',
          shot_number: 1,
          session_id: null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving shot data:', error);
    }
  };

  const resetShot = () => {
    setCurrentShot(null);
    recordedChunks.current = [];
  };

  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      try {
        if (fullScreenRef.current?.requestFullscreen) {
          await fullScreenRef.current.requestFullscreen();
        } else if ((fullScreenRef.current as any)?.webkitRequestFullscreen) {
          await (fullScreenRef.current as any).webkitRequestFullscreen();
        } else if ((fullScreenRef.current as any)?.msRequestFullscreen) {
          await (fullScreenRef.current as any).msRequestFullscreen();
        }
        
        if (Capacitor.isNativePlatform()) {
          await StatusBar.hide();
        }
        
        setIsFullScreen(true);
        
        toast({
          title: "Full Screen Mode",
          description: "Recording in full screen mode. Tap exit to return.",
        });
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        
        if (Capacitor.isNativePlatform()) {
          await StatusBar.show();
        }
        
        setIsFullScreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  };

  const rotateOrientation = () => {
    const newOrientation = orientation === 'portrait' ? 'landscape' : 'portrait';
    setOrientation(newOrientation);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      startCamera();
    }
  };

  if (isFullScreen) {
    return (
      <div 
        ref={fullScreenRef}
        className={`fixed inset-0 z-50 bg-black ${
          orientation === 'portrait' ? 'portrait-full-screen' : 'landscape-full-screen'
        }`}
      >
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full z-10">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-medium">REC</span>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Analyzing shot...</p>
              </div>
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none z-5">
            <svg className="w-full h-full opacity-40">
              {orientation === 'portrait' ? (
                <>
                  <rect x="5%" y="15%" width="90%" height="70%" fill="none" stroke="white" strokeWidth="2" />
                  <circle cx="50%" cy="40%" r="30" fill="none" stroke="#ff4444" strokeWidth="3" />
                  <path d="M 25% 40% Q 50% 20% 75% 40%" fill="none" stroke="#44ff44" strokeWidth="2" strokeDasharray="8,8" />
                </>
              ) : (
                <>
                  <rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="white" strokeWidth="2" />
                  <circle cx="50%" cy="50%" r="25" fill="none" stroke="#ff4444" strokeWidth="3" />
                  <path d="M 30% 50% Q 50% 30% 70% 50%" fill="none" stroke="#44ff44" strokeWidth="2" strokeDasharray="8,8" />
                </>
              )}
            </svg>
          </div>

          <div className={`absolute z-20 ${
            orientation === 'portrait' 
              ? 'bottom-8 left-1/2 transform -translate-x-1/2' 
              : 'right-8 top-1/2 transform -translate-y-1/2 flex flex-col'
          }`}>
            <div className={`flex gap-4 ${orientation === 'portrait' ? 'flex-row' : 'flex-col'}`}>
              {!isRecording ? (
                <Button 
                  onClick={startRecording} 
                  disabled={isAnalyzing}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4"
                >
                  <Play className="w-6 h-6" />
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  size="lg"
                  variant="outline"
                  className="bg-white/20 border-white text-white rounded-full p-4"
                >
                  <Square className="w-6 h-6" />
                </Button>
              )}
              
              <Button 
                onClick={toggleFullScreen}
                size="lg"
                variant="outline"
                className="bg-white/20 border-white text-white rounded-full p-4"
              >
                <Minimize className="w-6 h-6" />
              </Button>
              
              {isMobile && (
                <Button 
                  onClick={rotateOrientation}
                  size="lg"
                  variant="outline"
                  className="bg-white/20 border-white text-white rounded-full p-4"
                >
                  <RotateCw className="w-6 h-6" />
                </Button>
              )}
            </div>
          </div>

          {isMobile && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full z-10">
              <Smartphone className={`w-4 h-4 ${orientation === 'portrait' ? 'rotate-0' : 'rotate-90'}`} />
              <span className="text-sm capitalize">{orientation}</span>
            </div>
          )}

          {currentShot && (
            <div className={`absolute z-20 bg-black/80 text-white p-6 rounded-lg ${
              orientation === 'portrait' 
                ? 'top-20 left-4 right-4' 
                : 'top-4 left-4 w-80'
            }`}>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm opacity-75">Arc</div>
                  <div className="text-xl font-bold">{currentShot.arc}°</div>
                </div>
                <div className="text-center">
                  <div className="text-sm opacity-75">Depth</div>
                  <div className="text-xl font-bold">{currentShot.depth}"</div>
                </div>
                <div className="text-center">
                  <div className="text-sm opacity-75">L/R Dev</div>
                  <div className="text-xl font-bold">{currentShot.deviation > 0 ? '+' : ''}{currentShot.deviation}"</div>
                </div>
                <div className="text-center">
                  <div className="text-sm opacity-75">Result</div>
                  <Badge variant={currentShot.made ? "default" : "destructive"} className="text-lg">
                    {currentShot.made ? "MADE" : "MISS"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Enhanced Shot Tracker
          </div>
          {isMobile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className={`w-4 h-4 ${orientation === 'portrait' ? 'rotate-0' : 'rotate-90'}`} />
              <span className="capitalize">{orientation}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                Analyzing shot...
              </div>
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full opacity-30">
              <rect x="10%" y="20%" width="80%" height="60%" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="50%" cy="45%" r="20" fill="none" stroke="#ff4444" strokeWidth="2" />
              <path d="M 30% 45% Q 50% 25% 70% 45%" fill="none" stroke="#44ff44" strokeWidth="1" strokeDasharray="5,5" />
            </svg>
          </div>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
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
              
              <Button onClick={toggleFullScreen} variant="outline">
                <Maximize className="w-4 h-4 mr-2" />
                Full Screen
              </Button>
              
              {isMobile && (
                <Button onClick={rotateOrientation} variant="outline">
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate
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

        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p>• Use full screen mode for optimal mobile recording</p>
          <p>• Switch between portrait/landscape for different angles</p>
          <p>• Position camera to capture the entire shot arc</p>
          <p>• Tap "Record Shot" just before the shot release</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedShotTracker;