import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Save, SkipForward, RotateCcw, Download, Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { 
  useTryoutEvaluations, 
  type Player, 
  type TryoutEvaluation, 
  type EvaluationFormData 
} from '@/hooks/useTryoutEvaluations';

const TryoutRubricDashboard = () => {
  const { toast } = useToast();
  const { 
    loading, 
    saving, 
    fetchPlayers: hookFetchPlayers, 
    fetchEvaluations: hookFetchEvaluations, 
    saveEvaluation: hookSaveEvaluation, 
    exportEvaluations: hookExportEvaluations 
  } = useTryoutEvaluations();
  
  // State management
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Evaluation form state
  const [evaluation, setEvaluation] = useState<EvaluationFormData>({
    ball_handling: 0,
    shooting: 0,
    defense: 0,
    iq: 0,
    athleticism: 0,
    notes: '',
    event_name: 'Tryout Evaluation'
  });
  
  // Results table state
  const [evaluations, setEvaluations] = useState<TryoutEvaluation[]>([]);
  const [editingEvaluation, setEditingEvaluation] = useState<TryoutEvaluation | null>(null);
  
  // Computed values
  const total = evaluation.ball_handling + evaluation.shooting + evaluation.defense + evaluation.iq + evaluation.athleticism;
  const average = total > 0 ? (total / 5).toFixed(1) : '0.0';
  const suggestedPlacement = total >= 22 ? 'Gold' : total >= 16 ? 'Black' : 'White';
  const isFormValid = evaluation.ball_handling > 0 && evaluation.shooting > 0 && evaluation.defense > 0 && evaluation.iq > 0 && evaluation.athleticism > 0;

  const loadPlayers = async () => {
    const result = await hookFetchPlayers(searchTerm);
    setPlayers(result);
  };

  const loadEvaluations = async () => {
    const result = await hookFetchEvaluations();
    setEvaluations(result);
  };

  const handleSaveEvaluation = async (saveAndNext = false) => {
    if (!selectedPlayer || !isFormValid) {
      toast({
        title: 'Invalid Form',
        description: 'Please select a player and fill in all scoring fields (1-5).',
        variant: 'destructive'
      });
      return;
    }

    const success = await hookSaveEvaluation(
      selectedPlayer.id, 
      evaluation, 
      editingEvaluation?.id
    );

    if (success) {
      await Promise.all([loadPlayers(), loadEvaluations()]);
      
      if (saveAndNext && !editingEvaluation) {
        const currentIndex = players.findIndex(p => p.id === selectedPlayer.id);
        const nextPlayer = players[currentIndex + 1];
        if (nextPlayer) {
          handlePlayerSelect(nextPlayer);
        } else {
          resetForm();
          setSelectedPlayer(null);
        }
      } else {
        resetForm();
        if (editingEvaluation) {
          setSelectedPlayer(null);
        }
      }
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [searchTerm]);

  useEffect(() => {
    loadEvaluations();
  }, []);

  // Handle player selection
  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
    // If editing an evaluation, don't reset the form
    if (!editingEvaluation) {
      resetForm();
    }
  };

  // Reset form
  const resetForm = () => {
    setEvaluation({
      ball_handling: 0,
      shooting: 0,
      defense: 0,
      iq: 0,
      athleticism: 0,
      notes: '',
      event_name: 'Tryout Evaluation'
    });
    setEditingEvaluation(null);
  };

  // Export to CSV using hook
  const handleExportToCsv = async () => {
    const data = await hookExportEvaluations();
    if (!data) return;

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tryout-evaluations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Edit evaluation
  const editEvaluation = (evaluation: TryoutEvaluation) => {
    const player = players.find(p => p.id === evaluation.player_id);
    if (player) {
      setSelectedPlayer(player);
      setEvaluation({
        ball_handling: evaluation.ball_handling,
        shooting: evaluation.shooting,
        defense: evaluation.defense,
        iq: evaluation.iq,
        athleticism: evaluation.athleticism,
        notes: evaluation.notes || '',
        event_name: evaluation.event_name
      });
      setEditingEvaluation(evaluation);
    }
  };

  // Render scoring dropdown
  const renderScoreSelect = (field: keyof Pick<EvaluationFormData, 'ball_handling' | 'shooting' | 'defense' | 'iq' | 'athleticism'>, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Select
        value={evaluation[field] > 0 ? evaluation[field].toString() : ''}
        onValueChange={(value) => setEvaluation(prev => ({ ...prev, [field]: parseInt(value) }))}
      >
        <SelectTrigger className="h-12">
          <SelectValue placeholder="Select score" />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5].map(score => (
            <SelectItem key={score} value={score.toString()}>
              {score} - {score === 5 ? 'Excellent' : score === 4 ? 'Very Good' : score === 3 ? 'Good' : score === 2 ? 'Fair' : 'Needs Work'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Render placement badge
  const renderPlacementBadge = (placement: string) => {
    const colors = {
      Gold: 'bg-yellow-500 text-black',
      Black: 'bg-black text-white',
      White: 'bg-gray-200 text-black'
    };
    return (
      <Badge className={colors[placement as keyof typeof colors]}>
        {placement}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Tryout Rubric</h1>
        <p className="text-muted-foreground">
          Evaluate players across key basketball skills with standardized scoring.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Player Selection */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Player Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Search Players</Label>
                  <Input
                    id="search"
                    placeholder="Search approved players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="text-center py-4">Loading players...</div>
                  ) : players.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No approved players found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedPlayer?.id === player.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => handlePlayerSelect(player)}
                        >
                          <div className="font-medium">{player.full_name}</div>
                          <div className="text-sm text-muted-foreground">{player.email}</div>
                          {player.latest_tryout_total && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs">Last: {player.latest_tryout_total}/25</span>
                              {player.latest_tryout_placement && renderPlacementBadge(player.latest_tryout_placement)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Evaluation Form */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingEvaluation ? 'Edit Evaluation' : 'Tryout Evaluation'}
                {selectedPlayer && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    - {selectedPlayer.full_name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPlayer ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a player to begin evaluation
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Event Name */}
                  <div>
                    <Label htmlFor="event_name">Event Name</Label>
                    <Input
                      id="event_name"
                      value={evaluation.event_name}
                      onChange={(e) => setEvaluation(prev => ({ ...prev, event_name: e.target.value }))}
                      placeholder="e.g., Fall 2025 Tryouts"
                      className="mt-1"
                    />
                  </div>

                  {/* Scoring Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderScoreSelect('ball_handling', '1. Ball Handling & Control')}
                    {renderScoreSelect('shooting', '2. Shooting & Finishing')}
                    {renderScoreSelect('defense', '3. Defense & Hustle')}
                    {renderScoreSelect('iq', '4. Decision-Making / IQ')}
                    {renderScoreSelect('athleticism', '5. Physicality & Athleticism')}
                  </div>

                  <Separator />

                  {/* Computed Values */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{total}</div>
                      <div className="text-sm text-muted-foreground">Total (out of 25)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{average}</div>
                      <div className="text-sm text-muted-foreground">Average</div>
                    </div>
                    <div className="text-center">
                      {total > 0 && renderPlacementBadge(suggestedPlacement)}
                      <div className="text-sm text-muted-foreground mt-1">Suggested Placement</div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional observations and comments..."
                      value={evaluation.notes}
                      onChange={(e) => setEvaluation(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 min-h-24"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleSaveEvaluation(false)}
                      disabled={!isFormValid || saving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {editingEvaluation ? 'Update Evaluation' : 'Save Evaluation'}
                    </Button>
                    
                    {!editingEvaluation && (
                      <Button
                        onClick={() => handleSaveEvaluation(true)}
                        disabled={!isFormValid || saving}
                        variant="secondary"
                        className="flex items-center gap-2"
                      >
                        <SkipForward className="h-4 w-4" />
                        Save & Next
                      </Button>
                    )}
                    
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                    
                    <Button
                      onClick={handleExportToCsv}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Evaluations Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Evaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Evaluator</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          No evaluations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluations.map((evaluation) => (
                        <TableRow key={evaluation.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{evaluation.player_name}</TableCell>
                          <TableCell>{evaluation.total}/25</TableCell>
                          <TableCell>{renderPlacementBadge(evaluation.placement)}</TableCell>
                          <TableCell>{evaluation.evaluator_name}</TableCell>
                          <TableCell>{format(new Date(evaluation.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => editEvaluation(evaluation)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TryoutRubricDashboard;