import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Video, BarChart3, FileText, AlertTriangle, Trophy, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Player {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface Evaluation {
  id: string;
  player_id: string;
  video_filename: string;
  video_size_mb: number;
  analysis_status: string;
  shooting_score: number | null;
  passing_score: number | null;
  dribbling_score: number | null;
  foot_speed_score: number | null;
  vertical_jump_score: number | null;
  movement_score: number | null;
  body_alignment_score: number | null;
  injury_risk_level: string | null;
  development_plan: string | null;
  feedback: string | null;
  created_at: string;
  players: {
    profiles: {
      full_name: string;
    };
  };
}

const Evaluations = () => {
  const { currentUser } = useCurrentUser();
  const [players, setPlayers] = useState<Player[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
    fetchEvaluations();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        user_id
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to fetch players",
        variant: "destructive",
      });
      return;
    }

    // Fetch profiles separately
    if (data && data.length > 0) {
      const userIds = data.map(p => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const playersWithProfiles: Player[] = data.map(player => {
        const profile = profiles?.find(p => p.id === player.user_id);
        return {
          id: player.id,
          user_id: player.user_id,
          profiles: { full_name: profile?.full_name || 'Unknown' }
        };
      });

      setPlayers(playersWithProfiles);
    }
  };

  const fetchEvaluations = async () => {
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evaluations:', error);
      return;
    }

    if (data && data.length > 0) {
      // Get player IDs and fetch players with profiles
      const playerIds = data.map(e => e.player_id);
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, user_id')
        .in('id', playerIds);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        return;
      }

      // Get user IDs and fetch profiles
      const userIds = players?.map(p => p.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Combine the data
      const evaluationsWithProfiles: Evaluation[] = data.map(evaluation => {
        const player = players?.find(p => p.id === evaluation.player_id);
        const profile = profiles?.find(p => p.id === player?.user_id);
        return {
          id: evaluation.id,
          player_id: evaluation.player_id,
          video_filename: evaluation.video_filename,
          video_size_mb: evaluation.video_size_mb,
          analysis_status: evaluation.analysis_status,
          shooting_score: evaluation.shooting_score,
          passing_score: evaluation.passing_score,
          dribbling_score: evaluation.dribbling_score,
          foot_speed_score: evaluation.foot_speed_score,
          vertical_jump_score: evaluation.vertical_jump_score,
          movement_score: evaluation.movement_score,
          body_alignment_score: evaluation.body_alignment_score,
          injury_risk_level: evaluation.injury_risk_level,
          development_plan: evaluation.development_plan,
          feedback: evaluation.feedback,
          created_at: evaluation.created_at,
          players: {
            profiles: {
              full_name: profile?.full_name || 'Unknown'
            }
          }
        };
      });

      setEvaluations(evaluationsWithProfiles);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 50) {
        toast({
          title: "File too large",
          description: "Video file must be under 50MB due to upload limits",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!uploadedFile || !selectedPlayer) {
      toast({
        title: "Missing information",
        description: "Please select a player and upload a video",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${selectedPlayer}.${fileExt}`;
      const filePath = `evaluations/${fileName}`;

      // Upload video to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evaluation-videos')
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      // Create evaluation record
      const { data: evaluation, error: insertError } = await supabase
        .from('evaluations')
        .insert({
          player_id: selectedPlayer,
          video_url: uploadData.path,
          video_filename: uploadedFile.name,
          video_size_mb: uploadedFile.size / (1024 * 1024),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setIsUploading(false);
      setIsAnalyzing(true);
      setAnalysisProgress(0);

      // Start AI analysis
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 1000);

      // Call AI analysis edge function
      const { data: analysisResult, error: analysisError } = await supabase.functions
        .invoke('analyze-video-technique', {
          body: { 
            evaluationId: evaluation.id,
            videoPath: uploadData.path
          }
        });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setUploadedFile(null);
        setSelectedPlayer('');
        fetchEvaluations();
        
        toast({
          title: "Analysis Complete",
          description: "Video analysis has been completed successfully",
        });
      }, 1000);

    } catch (error) {
      console.error('Error uploading and analyzing:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: "Failed to upload and analyze video",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (risk: string | null) => {
    if (!risk) return 'bg-muted text-muted-foreground';
    switch (risk.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI-Powered Evaluations</h1>
            <p className="text-muted-foreground">Upload videos for automated technique analysis and development planning</p>
          </div>
          <div className="flex items-center space-x-2">
            <Video className="h-8 w-8 text-primary" />
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
            <TabsTrigger value="results">Evaluation Results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Video Upload & Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="player-select">Select Player</Label>
                      <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a player" />
                        </SelectTrigger>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.profiles.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="video-upload">Upload Video (Max 50MB)</Label>
                      <Input
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        disabled={isUploading || isAnalyzing}
                      />
                      {uploadedFile && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected: {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Analysis Features:</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Shooting technique & accuracy</li>
                        <li>• Passing precision & form</li>
                        <li>• Dribbling skills & control</li>
                        <li>• Foot speed & agility</li>
                        <li>• Vertical jump assessment</li>
                        <li>• Movement patterns</li>
                        <li>• Body alignment analysis</li>
                        <li>• Injury risk evaluation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {(isUploading || isAnalyzing) && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="font-semibold">
                        {isUploading ? 'Uploading Video...' : 'Analyzing Technique...'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {isUploading ? 'Please wait while we upload your video' : 'AI is analyzing the video content'}
                      </p>
                    </div>
                    {isAnalyzing && (
                      <div className="space-y-2">
                        <Progress value={analysisProgress} className="h-2" />
                        <p className="text-center text-sm text-muted-foreground">
                          {analysisProgress.toFixed(0)}% Complete
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  onClick={handleUploadAndAnalyze}
                  disabled={!selectedPlayer || !uploadedFile || isUploading || isAnalyzing}
                  className="w-full"
                >
                  {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing...' : 'Upload & Analyze Video'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <div className="space-y-6">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Trophy className="h-5 w-5" />
                        <span>{evaluation.players.profiles.full_name}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={evaluation.analysis_status === 'completed' ? 'default' : 'secondary'}
                        >
                          {evaluation.analysis_status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(evaluation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {evaluation.analysis_status === 'completed' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.shooting_score)}`}>
                              {evaluation.shooting_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Shooting</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.passing_score)}`}>
                              {evaluation.passing_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Passing</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.dribbling_score)}`}>
                              {evaluation.dribbling_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Dribbling</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.foot_speed_score)}`}>
                              {evaluation.foot_speed_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Foot Speed</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.vertical_jump_score)}`}>
                              {evaluation.vertical_jump_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Vertical Jump</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.movement_score)}`}>
                              {evaluation.movement_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Movement</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(evaluation.body_alignment_score)}`}>
                              {evaluation.body_alignment_score || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Body Alignment</div>
                          </div>
                        </div>

                        {evaluation.injury_risk_level && (
                          <div className="flex items-center justify-center space-x-2">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-semibold">Injury Risk:</span>
                            <Badge className={getRiskColor(evaluation.injury_risk_level)}>
                              {evaluation.injury_risk_level}
                            </Badge>
                          </div>
                        )}

                        {evaluation.feedback && (
                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              AI Feedback
                            </h4>
                            <p className="text-sm">{evaluation.feedback}</p>
                          </div>
                        )}

                        {evaluation.development_plan && (
                          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                            <h4 className="font-semibold mb-2 flex items-center">
                              <Activity className="h-4 w-4 mr-2" />
                              Development Plan
                            </h4>
                            <p className="text-sm">{evaluation.development_plan}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                        <p className="text-muted-foreground">Analysis in progress...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {evaluations.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Evaluations Yet</h3>
                    <p className="text-muted-foreground">Upload a video to get started with AI-powered technique analysis</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Evaluations;