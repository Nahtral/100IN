import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ShotIQSettings from '@/components/shotiq/settings/ShotIQSettings';
import TrainingHistory from '@/components/shotiq/history/TrainingHistory';
import ShotHeatmap from '@/components/shotiq/analytics/ShotHeatmap';
import AdvancedCharts from '@/components/shotiq/analytics/AdvancedCharts';
import ShotTracker from '@/components/shotiq/ShotTracker';
import VideoLogger from '@/components/shotiq/VideoLogger';
import ShotSessionModal from '@/components/shotiq/ShotSessionModal';
import SessionCard from '@/components/shotiq/SessionCard';
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
  RotateCcw,
  Plus,
  Clock,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useUserRole } from '@/hooks/useUserRole';

interface Player {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
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
  const { isSuperAdmin } = useUserRole();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [activeTab, setActiveTab] = useState('live-tracking');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [sessionName, setSessionName] = useState('Training Session');
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [makes, setMakes] = useState(0);
  const [realtimeAnalysis, setRealtimeAnalysis] = useState<ShotAnalysis | null>(null);
  const [rimHeight, setRimHeight] = useState(120); // 10 feet in inches
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Modal states
  const [sessionModal, setSessionModal] = useState<{
    open: boolean;
    mode: 'view' | 'create' | 'edit';
    session?: any;
  }>({
    open: false,
    mode: 'view',
    session: null
  });

  // Fetch player analytics data
  const { data: playerAnalytics } = useQuery({
    queryKey: ['player-analytics', selectedPlayer],
    queryFn: async () => {
      if (!selectedPlayer) return null;
      
      // Get player's overall stats
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('total_shots, total_makes, shooting_percentage, avg_arc_degrees, avg_depth_inches, total_sessions')
        .eq('id', selectedPlayer)
        .single();

      if (playerError) throw playerError;

      // Get recent shots
      const { data: recentShots, error: shotsError } = await supabase
        .from('shots')
        .select('*')
        .eq('player_id', selectedPlayer)
        .order('created_at', { ascending: false })
        .limit(10);

      if (shotsError) throw shotsError;

      // Get shot type breakdown
      const { data: shotTypes, error: typesError } = await supabase
        .from('shots')
        .select('shot_type, made')
        .eq('player_id', selectedPlayer);

      if (typesError) throw typesError;

      // Calculate shot type percentages
      const typeStats = shotTypes?.reduce((acc: any, shot: any) => {
        const type = shot.shot_type || 'unknown';
        if (!acc[type]) {
          acc[type] = { total: 0, makes: 0 };
        }
        acc[type].total++;
        if (shot.made) acc[type].makes++;
        return acc;
      }, {});

      return {
        ...playerData,
        recentShots: recentShots || [],
        shotTypeStats: typeStats || {}
      };
    },
    enabled: !!selectedPlayer
  });

  // Fetch players for selection
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      // Get players with both linked users and manual entries
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, user_id, manual_entry_name, manual_entry_email, position, jersey_number')
        .eq('is_active', true);

      if (playersError) throw playersError;

      // Get profiles for players that have user_id
      const playersWithUserId = playersData?.filter(p => p.user_id) || [];
      const userIds = playersWithUserId.map(p => p.user_id);
      
      let profilesData = [];
      if (userIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        profilesData = data || [];
      }

      // Combine the data
      const combinedData = playersData?.map(player => {
        if (player.user_id) {
          // Player with linked user account
          const profile = profilesData?.find(p => p.id === player.user_id);
          return {
            ...player,
            full_name: profile?.full_name || profile?.email || 'Unknown Player',
            email: profile?.email
          };
        } else {
          // Manually entered player
          return {
            ...player,
            full_name: player.manual_entry_name || 'Unknown Player',
            email: player.manual_entry_email
          };
        }
      });

      return combinedData as Player[];
    }
  });

  // Fetch shot sessions with enhanced data
  const { data: shotSessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['shot-sessions'],
    queryFn: async () => {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('shot_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (sessionsError) throw sessionsError;

      // Get player names for sessions
      const playerIds = [...new Set(sessionsData?.map(s => s.player_id) || [])];
      const playerProfiles = await Promise.all(
        playerIds.map(async (playerId) => {
          const { data: playerData } = await supabase
            .from('players')
            .select('id, user_id')
            .eq('id', playerId)
            .single();

          if (playerData) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', playerData.user_id)
              .single();

            return {
              player_id: playerId,
              player_name: profileData?.full_name || profileData?.email || 'Unknown Player'
            };
          }
          return null;
        })
      );

      const playerMap = playerProfiles.reduce((acc, profile) => {
        if (profile) {
          acc[profile.player_id] = profile.player_name;
        }
        return acc;
      }, {} as Record<string, string>);

      return sessionsData?.map(session => ({
        ...session,
        player_name: playerMap[session.player_id] || 'Unknown Player',
        status: (session.notes && session.notes.includes('[ARCHIVED')) ? 'archived' as const : 'active' as const
      })) || [];
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
        description: `Tracking session for ${players?.find(p => p.id === selectedPlayer)?.full_name}`,
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

  // Modal handlers
  const handleSessionView = (session: any) => {
    setSessionModal({ open: true, mode: 'view', session });
  };

  const handleSessionEdit = (session: any) => {
    setSessionModal({ open: true, mode: 'edit', session });
  };

  const handleSessionCreate = () => {
    setSessionModal({ open: true, mode: 'create', session: null });
  };

  const closeModal = () => {
    setSessionModal({ open: false, mode: 'view', session: null });
  };

  const handleSessionArchive = async (session: any) => {
    try {
      // For now, we'll just add a note about archiving since the table might not have status column
      const { error } = await supabase
        .from('shot_sessions')
        .update({ 
          notes: (session.notes || '') + (session.notes ? '\n' : '') + `[ARCHIVED at ${new Date().toISOString()}]`
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Session Archived",
        description: "Session has been marked as archived in notes",
      });

      refetchSessions();
    } catch (error) {
      console.error('Error archiving session:', error);
      toast({
        title: "Error",
        description: "Failed to archive session",
        variant: "destructive",
      });
    }
  };

  const handleSessionDelete = async (session: any) => {
    if (!confirm('Are you sure you want to delete this session? This will also delete all associated shot data.')) {
      return;
    }

    try {
      await supabase.from('shots').delete().eq('session_id', session.id);
      const { error } = await supabase.from('shot_sessions').delete().eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Session Deleted",
        description: "Session and all associated data have been deleted",
      });

      refetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
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
    <Layout>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live-tracking">Live Tracking</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="live-tracking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shot Tracker Component */}
            <div className="lg:col-span-2">
              <ShotTracker
                playerId={selectedPlayer || ''}
                onShotTracked={(shot) => {
                  setRealtimeAnalysis({
                    arc_degrees: shot.arc,
                    depth_inches: shot.depth,
                    lr_deviation_inches: shot.deviation,
                    made: shot.made,
                    shot_type: 'live_tracking',
                    court_x_position: Math.random() * 100,
                    court_y_position: Math.random() * 100,
                    audio_feedback: ''
                  });
                  setShotCount(prev => prev + 1);
                  if (shot.made) setMakes(prev => prev + 1);
                }}
              />
            </div>

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
                            {player.full_name}
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

        <TabsContent value="sessions" className="space-y-6">
          {/* Sessions Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Shot Sessions</h2>
              <p className="text-muted-foreground">Manage and review shot training sessions</p>
            </div>
            {isSuperAdmin && (
              <Button onClick={handleSessionCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            )}
          </div>

          {/* Sessions Overview Stats */}
          {shotSessions && shotSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sessions Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{shotSessions.length}</div>
                    <div className="text-sm text-muted-foreground">Total Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {shotSessions.filter(s => !(s.notes && s.notes.includes('[ARCHIVED'))).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {shotSessions.reduce((acc, s) => acc + (s.total_shots || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Shots</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {shotSessions.reduce((acc, s) => acc + (s.total_shots || 0), 0) > 0 ? (
                        (shotSessions.reduce((acc, s) => acc + (s.makes || 0), 0) / 
                         shotSessions.reduce((acc, s) => acc + (s.total_shots || 0), 0) * 100).toFixed(1)
                      ) : '0'}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions Grid */}
          {sessionsLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                Loading sessions...
              </CardContent>
            </Card>
          ) : shotSessions && shotSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shotSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onView={handleSessionView}
                  onEdit={handleSessionEdit}
                  onArchive={handleSessionArchive}
                  onDelete={handleSessionDelete}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No Sessions Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start creating shot training sessions to track player performance
                </p>
                {isSuperAdmin && (
                  <Button onClick={handleSessionCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Session
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Player Selection for Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Player Analytics</CardTitle>
                <CardDescription>
                  Select a player to view detailed shot analytics and performance data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="analytics-player-select">Select Player</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a player to analyze" />
                      </SelectTrigger>
                      <SelectContent>
                        {players?.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedPlayer && (
              <>
                {/* Player Stats Overview */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {playerAnalytics?.shooting_percentage?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-sm text-muted-foreground">Shooting %</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {playerAnalytics?.total_shots || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Shots</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {playerAnalytics?.avg_arc_degrees?.toFixed(1) || '0.0'}°
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Arc</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {playerAnalytics?.total_sessions || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Sessions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shot Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shot Heatmap</CardTitle>
                    <CardDescription>
                      Visual representation of shot locations and accuracy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ShotHeatmap 
                      shots={playerAnalytics?.recentShots?.map((shot: any) => ({
                        x: shot.court_x_position || Math.random() * 400 + 200,
                        y: shot.court_y_position || Math.random() * 300 + 200,
                        made: shot.made,
                        arc: shot.arc_degrees,
                        depth: shot.depth_inches
                      })) || []}
                    />
                  </CardContent>
                </Card>
                
                {/* Advanced Charts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Analysis</CardTitle>
                    <CardDescription>
                      Detailed charts showing shooting mechanics and trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdvancedCharts 
                      shots={playerAnalytics?.recentShots?.map((shot: any) => ({
                        id: shot.id,
                        arc: shot.arc_degrees || 45 + Math.random() * 10,
                        depth: shot.depth_inches || (Math.random() - 0.5) * 8,
                        deviation: shot.lr_deviation_inches || (Math.random() - 0.5) * 6,
                        made: shot.made,
                        timestamp: shot.created_at,
                        shotType: shot.shot_type || 'catch-and-shoot'
                      })) || []}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <TrainingHistory playerId={selectedPlayer} />
        </TabsContent>

        <TabsContent value="settings">
          <ShotIQSettings playerId={selectedPlayer} />
        </TabsContent>
      </Tabs>

      {/* Session Modal */}
      <ShotSessionModal
        session={sessionModal.session}
        open={sessionModal.open}
        onClose={closeModal}
        onSuccess={() => {
          refetchSessions();
          closeModal();
        }}
        mode={sessionModal.mode}
      />
    </div>
    </Layout>
  );
};

export default ShotIQ;