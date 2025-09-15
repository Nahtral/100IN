import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useProductionGrading } from '@/hooks/useProductionGrading';
import { Save, Users, TrendingUp } from 'lucide-react';

interface Player {
  id: string;
  user_id: string;
  full_name: string;
}

interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  players: Player[];
  eventTitle: string;
}

const skillCategories = [
  { key: 'shooting', label: 'Shooting', color: 'text-red-600' },
  { key: 'ball_handling', label: 'Ball Handling', color: 'text-blue-600' },
  { key: 'passing', label: 'Passing', color: 'text-green-600' },
  { key: 'rebounding', label: 'Rebounding', color: 'text-purple-600' },
  { key: 'footwork', label: 'Footwork', color: 'text-orange-600' },
  { key: 'decision_making', label: 'Decision Making', color: 'text-indigo-600' },
  { key: 'consistency', label: 'Consistency', color: 'text-pink-600' },
  { key: 'communication', label: 'Communication', color: 'text-teal-600' },
  { key: 'cutting', label: 'Cutting', color: 'text-yellow-600' },
  { key: 'teammate_support', label: 'Teammate Support', color: 'text-cyan-600' },
  { key: 'competitiveness', label: 'Competitiveness', color: 'text-red-500' },
  { key: 'coachable', label: 'Coachable', color: 'text-green-500' },
  { key: 'leadership', label: 'Leadership', color: 'text-purple-500' },
  { key: 'reaction_time', label: 'Reaction Time', color: 'text-blue-500' },
  { key: 'game_iq', label: 'Game IQ', color: 'text-indigo-500' },
  { key: 'boxout_frequency', label: 'Boxout Frequency', color: 'text-orange-500' },
  { key: 'court_vision', label: 'Court Vision', color: 'text-teal-500' },
];

export const ProductionGradingModal: React.FC<GradingModalProps> = ({
  isOpen,
  onClose,
  eventId,
  players,
  eventTitle
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { 
    grades, 
    loading, 
    saving, 
    savePlayerGrades, 
    updatePlayerGrades, 
    getPlayerGrades 
  } = useProductionGrading(eventId);

  React.useEffect(() => {
    if (players.length > 0 && !selectedPlayer) {
      setSelectedPlayer(players[0]);
    }
  }, [players, selectedPlayer]);

  const currentPlayerGrades = selectedPlayer ? getPlayerGrades(selectedPlayer.user_id) : null;
  const currentGrades = currentPlayerGrades?.grades || {};
  const overallGrade = currentPlayerGrades?.overall || 0;
  const lastSaved = currentPlayerGrades?.lastSaved;
  const isSaving = selectedPlayer ? saving.has(selectedPlayer.user_id) : false;

  const handleGradeChange = (skillKey: string, value: number[]) => {
    if (!selectedPlayer) return;
    
    updatePlayerGrades(selectedPlayer.user_id, {
      [skillKey]: value[0]
    });
  };

  const handleSaveGrades = async () => {
    if (!selectedPlayer) return;

    const success = await savePlayerGrades(selectedPlayer.user_id, currentGrades);
    if (success) {
      // Grades are automatically updated via the hook
    }
  };

  const hasUnsavedChanges = currentPlayerGrades && !lastSaved;
  const hasChangedSinceLastSave = currentPlayerGrades && lastSaved && 
    Object.values(currentGrades).some(value => value !== undefined);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Player Grading - {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map(player => {
                const playerGrades = getPlayerGrades(player.user_id);
                const isSelected = selectedPlayer?.user_id === player.user_id;
                
                return (
                  <div
                    key={player.user_id}
                    className={`p-2 rounded cursor-pointer border transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="font-medium text-sm">{player.full_name}</div>
                    <div className="flex items-center justify-between mt-1">
                      {playerGrades ? (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {playerGrades.overall.toFixed(1)}
                          </Badge>
                          {playerGrades.lastSaved && (
                            <div className="text-xs text-green-600">✓ Saved</div>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Not Graded
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Grading Interface */}
          <div className="md:col-span-3">
            {selectedPlayer ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Grading: {selectedPlayer.full_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {lastSaved && (
                        <div className="text-xs text-muted-foreground">
                          Last saved: {lastSaved.toLocaleTimeString()}
                        </div>
                      )}
                      <Badge 
                        variant={overallGrade >= 8 ? "default" : overallGrade >= 6 ? "secondary" : "destructive"}
                        className="text-sm"
                      >
                        Overall: {overallGrade.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Skill Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skillCategories.map(skill => {
                      const currentValue = currentGrades[skill.key as keyof typeof currentGrades] || 5;
                      
                      return (
                        <div key={skill.key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className={`text-sm font-medium ${skill.color}`}>
                              {skill.label}
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {currentValue}/10
                            </Badge>
                          </div>
                          <Slider
                            value={[currentValue]}
                            onValueChange={(value) => handleGradeChange(skill.key, value)}
                            max={10}
                            min={1}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  {/* Save Button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {hasUnsavedChanges || hasChangedSinceLastSave 
                        ? "You have unsaved changes" 
                        : "All changes saved"
                      }
                    </div>
                    <Button 
                      onClick={handleSaveGrades}
                      disabled={isSaving || loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Grades'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                  Select a player to begin grading
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};