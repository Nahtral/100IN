import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Camera, Loader2, CheckCircle, AlertCircle, FileImage } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface GameLogUploadProps {
  onStatsExtracted: () => void;
}

interface ExtractedStats {
  player_id: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  field_goals_made: number;
  field_goals_attempted: number;
  three_points_made: number;
  three_points_attempted: number;
  free_throws_made: number;
  free_throws_attempted: number;
  minutes_played: number;
  plus_minus: number;
  game_rating: number;
}

interface UnmatchedPlayer {
  playerName: string;
  jerseyNumber: string;
  points: number;
  rebounds: number;
  assists: number;
}

export const GameLogUpload: React.FC<GameLogUploadProps> = ({ onStatsExtracted }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gameDate, setGameDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [gameResult, setGameResult] = useState('');
  const [extractedStats, setExtractedStats] = useState<ExtractedStats[]>([]);
  const [unmatchedPlayers, setUnmatchedPlayers] = useState<UnmatchedPlayer[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeScreenshot = async () => {
    if (!selectedFile || !gameDate || !opponent || !gameResult) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select an image.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const imageBase64 = await convertFileToBase64(selectedFile);
      
      const { data, error } = await supabase.functions.invoke('analyze-game-stats', {
        body: {
          imageBase64,
          gameDate,
          opponent,
          gameResult
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to analyze screenshot');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setExtractedStats(data.extractedStats || []);
      setUnmatchedPlayers(data.unmatchedPlayers || []);
      setConfidence(data.confidence || 0);

      toast({
        title: "Analysis complete",
        description: `Extracted stats for ${data.extractedStats?.length || 0} player(s) with ${Math.round((data.confidence || 0) * 100)}% confidence.`,
      });

    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze screenshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveStatsToDatabase = async () => {
    if (extractedStats.length === 0) return;

    try {
      // Get current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const gameLogsToInsert = extractedStats.map(stat => ({
        player_id: stat.player_id,
        game_date: gameDate,
        opponent: opponent,
        result: gameResult,
        points: stat.points,
        rebounds: stat.rebounds,
        assists: stat.assists,
        steals: stat.steals,
        blocks: stat.blocks,
        turnovers: stat.turnovers,
        field_goals_made: stat.field_goals_made,
        field_goals_attempted: stat.field_goals_attempted,
        three_points_made: stat.three_points_made,
        three_points_attempted: stat.three_points_attempted,
        free_throws_made: stat.free_throws_made,
        free_throws_attempted: stat.free_throws_attempted,
        minutes_played: stat.minutes_played,
        plus_minus: stat.plus_minus,
        game_rating: stat.game_rating,
        upload_method: 'screenshot',
        ai_processed: true,
        ai_confidence: confidence,
        performance_notes: `Extracted from screenshot analysis (${Math.round(confidence * 100)}% confidence)`,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('game_logs')
        .insert(gameLogsToInsert);

      if (error) {
        console.error('Error saving stats:', error);
        throw new Error('Failed to save stats to database');
      }

      toast({
        title: "Success",
        description: `Saved game logs for ${extractedStats.length} player(s).`,
      });

      // Reset form
      setSelectedFile(null);
      setGameDate('');
      setOpponent('');
      setGameResult('');
      setExtractedStats([]);
      setUnmatchedPlayers([]);
      setConfidence(0);
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }

      onStatsExtracted();

    } catch (error) {
      console.error('Error saving stats:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save stats. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5" />
          <span>Upload Game Stats Screenshot</span>
        </CardTitle>
        <CardDescription>
          Upload a screenshot of game statistics and let AI automatically extract player stats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Game Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="gameDate">Game Date</Label>
            <Input
              id="gameDate"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="opponent">Opponent</Label>
            <Input
              id="opponent"
              placeholder="Team name"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="result">Game Result</Label>
            <Input
              id="result"
              placeholder="W 95-80 or L 78-85"
              value={gameResult}
              onChange={(e) => setGameResult(e.target.value)}
              required
            />
          </div>
        </div>

        {/* File Upload */}
        <div>
          <Label htmlFor="screenshot">Screenshot Upload</Label>
          <div className="mt-2">
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
          
          {selectedFile && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileImage className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <Badge variant="secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                >
                  Preview
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            onClick={analyzeScreenshot}
            disabled={isAnalyzing || !selectedFile || !gameDate || !opponent || !gameResult}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Analyze Screenshot
              </>
            )}
          </Button>

          {extractedStats.length > 0 && (
            <Button
              onClick={saveStatsToDatabase}
              variant="default"
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Stats ({extractedStats.length} players)
            </Button>
          )}
        </div>

        {/* Analysis Results */}
        {extractedStats.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Extracted Stats</h3>
              <Badge variant={confidence > 0.8 ? "default" : confidence > 0.6 ? "secondary" : "destructive"}>
                {Math.round(confidence * 100)}% confidence
              </Badge>
            </div>
            
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>PTS</TableHead>
                    <TableHead>REB</TableHead>
                    <TableHead>AST</TableHead>
                    <TableHead>STL</TableHead>
                    <TableHead>BLK</TableHead>
                    <TableHead>TO</TableHead>
                    <TableHead>FG</TableHead>
                    <TableHead>3PT</TableHead>
                    <TableHead>FT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">Player #{index + 1}</TableCell>
                      <TableCell>{stat.points}</TableCell>
                      <TableCell>{stat.rebounds}</TableCell>
                      <TableCell>{stat.assists}</TableCell>
                      <TableCell>{stat.steals}</TableCell>
                      <TableCell>{stat.blocks}</TableCell>
                      <TableCell>{stat.turnovers}</TableCell>
                      <TableCell>{stat.field_goals_made}/{stat.field_goals_attempted}</TableCell>
                      <TableCell>{stat.three_points_made}/{stat.three_points_attempted}</TableCell>
                      <TableCell>{stat.free_throws_made}/{stat.free_throws_attempted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Unmatched Players Warning */}
        {unmatchedPlayers.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {unmatchedPlayers.length} player(s) could not be matched to existing roster
              </span>
            </div>
            <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
              These players were detected but not found in your current roster. Consider adding them or checking jersey numbers.
            </div>
          </div>
        )}

        {/* Image Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Screenshot Preview</DialogTitle>
              <DialogDescription>
                Preview of the uploaded screenshot before analysis
              </DialogDescription>
            </DialogHeader>
            {previewUrl && (
              <div className="max-h-96 overflow-auto">
                <img 
                  src={previewUrl} 
                  alt="Screenshot preview" 
                  className="w-full h-auto rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};