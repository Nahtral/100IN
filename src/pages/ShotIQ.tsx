import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Camera, 
  Video, 
  Play, 
  Square, 
  Target,
  BarChart3,
  MessageSquare,
  Settings,
  Download,
  Pause,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Player {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface ShotAnalysis {
  arc_degrees: number;
  depth_inches: number;
  lr_deviation_inches: number;
  made: boolean;
  shot_type: string;
  court_x_position: number;
  court_y_position: number;
  audio_feedback: string;
}

const ShotIQ = () => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [sessionName, setSessionName] = useState('Training Session');
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [makes, setMakes] = useState(0);
  const [realtimeAnalysis, setRealtimeAnalysis] = useState<ShotAnalysis | null>(null);
  const [rimHeight, setRimHeight] = useState(120); // 10 feet in inches
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Fetch players for selection
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          profiles(full_name)
        `)
        .eq('is_active', true);

      if (error) throw error;
      return data as any[];
    }
  });

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      toast({
        title: "Camera initialized",
        description: "Ready to start tracking shots",
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Start new session
  const startSession = async () => {
    if (!selectedPlayer) {
      toast({
        title: "No Player Selected",
        description: "Please select a player before starting a session.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: session, error } = await supabase
        .from('shot_sessions')
        .insert({
          player_id: selectedPlayer,
          super_admin_id: (await supabase.auth.getUser()).data.user?.id,
          session_name: sessionName,
          rim_height_inches: rimHeight,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session.id);
      setShotCount(0);
      setMakes(0);
      
      toast({
        title: "Session Started",
        description: `Tracking session for ${players?.find(p => p.id === selectedPlayer)?.profiles?.full_name}`,
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
    }
  };

  // Mock AI shot analysis (in production, this would use computer vision)
  const analyzeShot = async (videoBlob: Blob): Promise<ShotAnalysis> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock analysis results
    const analysis: ShotAnalysis = {
      arc_degrees: Math.random() * 20 + 40, // 40-60 degrees
      depth_inches: (Math.random() - 0.5) * 12, // -6 to +6 inches from rim
      lr_deviation_inches: (Math.random() - 0.5) * 8, // -4 to +4 inches L/R
      made: Math.random() > 0.5,
      shot_type: 'catch-and-shoot',
      court_x_position: Math.random() * 100,
      court_y_position: Math.random() * 100,
      audio_feedback: ''
    };

    // Generate audio feedback
    const arcFeedback = analysis.arc_degrees < 45 ? "Too flat" : analysis.arc_degrees > 55 ? "Too high" : "Perfect arc";
    const depthFeedback = Math.abs(analysis.depth_inches) > 3 ? (analysis.depth_inches > 0 ? "Too long" : "Too short") : "Good depth";
    const lrFeedback = Math.abs(analysis.lr_deviation_inches) > 2 ? (analysis.lr_deviation_inches > 0 ? "Right" : "Left") : "Centered";
    
    analysis.audio_feedback = `${arcFeedback}, ${depthFeedback}, ${lrFeedback}`;

    return analysis;
  };

  // Capture and analyze shot
  const captureShot = async () => {
    if (!currentSession || !videoRef.current) return;

    try {
      // Start recording
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        
        // Analyze the shot
        const analysis = await analyzeShot(videoBlob);
        setRealtimeAnalysis(analysis);

        // Update shot count
        const newShotCount = shotCount + 1;
        setShotCount(newShotCount);
        
        if (analysis.made) {
          setMakes(makes + 1);
        }

        // Store shot in database
        const { error } = await supabase
          .from('shots')
          .insert({
            session_id: currentSession,
            player_id: selectedPlayer,
            shot_number: newShotCount,
            arc_degrees: analysis.arc_degrees,
            depth_inches: analysis.depth_inches,
            lr_deviation_inches: analysis.lr_deviation_inches,
            shot_type: analysis.shot_type,
            court_x_position: analysis.court_x_position,
            court_y_position: analysis.court_y_position,
            made: analysis.made,
            audio_feedback: analysis.audio_feedback,
            ai_analysis_data: analysis as any,
            timestamp_in_session: Date.now()
          });

        if (error) {
          console.error('Error storing shot:', error);
        }

        // Provide audio feedback
        if (audioEnabled && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(analysis.audio_feedback);
          utterance.rate = 1.2;
          speechSynthesis.speak(utterance);
        }

        toast({
          title: analysis.made ? "Great shot!" : "Keep practicing!",
          description: analysis.audio_feedback,
        });
      };

      mediaRecorder.start();
      
      // Record for 3 seconds
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3000);

    } catch (error) {
      console.error('Error capturing shot:', error);
      toast({
        title: "Error",
        description: "Failed to capture shot",
        variant: "destructive",
      });
    }
  };

  // End current session
  const endSession = async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('shot_sessions')
        .update({
          total_shots: shotCount,
          makes: makes,
          session_duration_minutes: 30, // Mock duration
        })
        .eq('id', currentSession);

      setCurrentSession(null);
      setShotCount(0);
      setMakes(0);
      setRealtimeAnalysis(null);

      toast({
        title: "Session Ended",
        description: `Session saved with ${shotCount} shots`,
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  useEffect(() => {
    initializeCamera();
    
    return () => {
      // Cleanup camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary">ShotIQ</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered basketball shot tracking and analysis
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Super Admin Only
          </Badge>
        </div>

        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="live">Live Tracking</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Camera Feed */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Live Camera Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full rounded-lg bg-black"
                      autoPlay
                      muted
                      playsInline
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full opacity-50"
                    />
                    
                    {/* Overlay UI */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between">
                      <Badge variant="secondary">
                        {currentSession ? 'Recording' : 'Ready'}
                      </Badge>
                      {realtimeAnalysis && (
                        <Badge variant={realtimeAnalysis.made ? "default" : "outline"}>
                          {realtimeAnalysis.made ? 'MAKE' : 'MISS'}
                        </Badge>
                      )}
                    </div>

                    {/* Shot feedback overlay */}
                    {realtimeAnalysis && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/80 text-white p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-sm opacity-80">Arc</div>
                            <div className="font-bold">{realtimeAnalysis.arc_degrees.toFixed(1)}°</div>
                          </div>
                          <div>
                            <div className="text-sm opacity-80">Depth</div>
                            <div className="font-bold">{realtimeAnalysis.depth_inches.toFixed(1)}"</div>
                          </div>
                          <div>
                            <div className="text-sm opacity-80">L/R</div>
                            <div className="font-bold">{realtimeAnalysis.lr_deviation_inches.toFixed(1)}"</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Controls & Stats */}
              <div className="space-y-6">
                {/* Session Setup */}
                <Card>
                  <CardHeader>
                    <CardTitle>Session Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="player-select">Select Player</Label>
                      <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a player" />
                        </SelectTrigger>
                        <SelectContent>
                          {players?.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.profiles?.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="session-name">Session Name</Label>
                      <Input
                        id="session-name"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="Training Session"
                      />
                    </div>

                    {!currentSession ? (
                      <Button onClick={startSession} className="w-full" disabled={!selectedPlayer}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Session
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button onClick={captureShot} className="w-full">
                          <Target className="h-4 w-4 mr-2" />
                          Capture Shot
                        </Button>
                        <Button onClick={endSession} variant="outline" className="w-full">
                          <Square className="h-4 w-4 mr-2" />
                          End Session
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Live Stats */}
                {currentSession && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Live Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{shotCount}</div>
                          <div className="text-sm text-muted-foreground">Shots</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{makes}</div>
                          <div className="text-sm text-muted-foreground">Makes</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Shooting %</span>
                          <span>{shotCount > 0 ? ((makes / shotCount) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <Progress value={shotCount > 0 ? (makes / shotCount) * 100 : 0} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Shot Charts Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Advanced analytics and shot charts will be available in the next update.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Session History</CardTitle>
                <CardDescription>
                  View past training sessions and progress over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Session history will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Camera Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="rim-height">Rim Height (inches)</Label>
                    <Input
                      id="rim-height"
                      type="number"
                      value={rimHeight}
                      onChange={(e) => setRimHeight(Number(e.target.value))}
                      min={96}
                      max={144}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="audio-feedback"
                      checked={audioEnabled}
                      onChange={(e) => setAudioEnabled(e.target.checked)}
                    />
                    <Label htmlFor="audio-feedback">Enable Audio Feedback</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Analysis Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI model configurations and shot detection sensitivity settings will be available here.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default ShotIQ;