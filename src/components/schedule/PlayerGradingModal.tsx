import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Save, User, Trophy, Target, Users, MessageSquare, Zap, Brain, Eye } from 'lucide-react';
import { useEventGrades, GradeFormData, EventPlayerGrade } from '@/hooks/useEventGrades';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface ScheduleEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
}

interface TeamWithPlayers {
  id: string;
  name: string;
  players: {
    id: string;
    user_id: string;
    jersey_number?: number;
    position?: string;
    profiles?: {
      full_name: string;
      email: string;
    };
  }[];
}

interface PlayerGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  teams: TeamWithPlayers[];
}

const SKILL_CATEGORIES = [
  { key: 'shooting', label: 'Shooting', icon: Target, color: 'text-red-500' },
  { key: 'ball_handling', label: 'Ball Handling', icon: Zap, color: 'text-orange-500' },
  { key: 'passing', label: 'Passing', icon: Users, color: 'text-blue-500' },
  { key: 'rebounding', label: 'Rebounding', icon: Trophy, color: 'text-green-500' },
  { key: 'footwork', label: 'Footwork', icon: Target, color: 'text-purple-500' },
  { key: 'decision_making', label: 'Decision Making', icon: Brain, color: 'text-indigo-500' },
  { key: 'consistency', label: 'Consistency', icon: Target, color: 'text-pink-500' },
  { key: 'communication', label: 'Communication', icon: MessageSquare, color: 'text-cyan-500' },
  { key: 'cutting', label: 'Cutting', icon: Zap, color: 'text-yellow-500' },
  { key: 'teammate_support', label: 'Teammate Support', icon: Users, color: 'text-teal-500' },
  { key: 'competitiveness', label: 'Competitiveness', icon: Trophy, color: 'text-red-600' },
  { key: 'coachable', label: 'Coachable', icon: MessageSquare, color: 'text-blue-600' },
  { key: 'leadership', label: 'Leadership', icon: Users, color: 'text-green-600' },
  { key: 'reaction_time', label: 'Reaction Time', icon: Zap, color: 'text-orange-600' },
  { key: 'game_iq', label: 'Game IQ', icon: Brain, color: 'text-purple-600' },
  { key: 'boxout_frequency', label: 'Boxout Frequency', icon: Target, color: 'text-indigo-600' },
  { key: 'court_vision', label: 'Court Vision', icon: Eye, color: 'text-pink-600' }
] as const;

const PlayerGradingModal: React.FC<PlayerGradingModalProps> = ({
  isOpen,
  onClose,
  event,
  teams
}) => {
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const { grades, loading, submitGrade, updateGrade, getPlayerGrade } = useEventGrades(event?.id);
  
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState<GradeFormData>({
    shooting: 5,
    ball_handling: 5,
    passing: 5,
    rebounding: 5,
    footwork: 5,
    decision_making: 5,
    consistency: 5,
    communication: 5,
    cutting: 5,
    teammate_support: 5,
    competitiveness: 5,
    coachable: 5,
    leadership: 5,
    reaction_time: 5,
    game_iq: 5,
    boxout_frequency: 5,
    court_vision: 5,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Check if user can grade players
  const canGradePlayers = isSuperAdmin() || hasRole('coach') || hasRole('staff');

  // Get all players from all teams
  const allPlayers = teams.flatMap(team => team.players);

  // Load existing grade when player is selected
  useEffect(() => {
    if (selectedPlayer) {
      const existingGrade = getPlayerGrade(selectedPlayer);
      if (existingGrade) {
        setGradeData({
          shooting: existingGrade.shooting || 5,
          ball_handling: existingGrade.ball_handling || 5,
          passing: existingGrade.passing || 5,
          rebounding: existingGrade.rebounding || 5,
          footwork: existingGrade.footwork || 5,
          decision_making: existingGrade.decision_making || 5,
          consistency: existingGrade.consistency || 5,
          communication: existingGrade.communication || 5,
          cutting: existingGrade.cutting || 5,
          teammate_support: existingGrade.teammate_support || 5,
          competitiveness: existingGrade.competitiveness || 5,
          coachable: existingGrade.coachable || 5,
          leadership: existingGrade.leadership || 5,
          reaction_time: existingGrade.reaction_time || 5,
          game_iq: existingGrade.game_iq || 5,
          boxout_frequency: existingGrade.boxout_frequency || 5,
          court_vision: existingGrade.court_vision || 5,
          notes: existingGrade.notes || ''
        });
      } else {
        // Reset to default values for new grade
        setGradeData({
          shooting: 5,
          ball_handling: 5,
          passing: 5,
          rebounding: 5,
          footwork: 5,
          decision_making: 5,
          consistency: 5,
          communication: 5,
          cutting: 5,
          teammate_support: 5,
          competitiveness: 5,
          coachable: 5,
          leadership: 5,
          reaction_time: 5,
          game_iq: 5,
          boxout_frequency: 5,
          court_vision: 5,
          notes: ''
        });
      }
    }
  }, [selectedPlayer, getPlayerGrade]);

  const handleSliderChange = (key: keyof GradeFormData, value: number[]) => {
    setGradeData(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSaveGrade = async () => {
    if (!selectedPlayer) return;

    setSaving(true);
    try {
      const existingGrade = getPlayerGrade(selectedPlayer);
      
      if (existingGrade) {
        await updateGrade(existingGrade.id, gradeData);
      } else {
        await submitGrade(selectedPlayer, gradeData);
      }
      
      // Don't close modal, allow grading multiple players
    } finally {
      setSaving(false);
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeBadgeColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const calculateOverallGrade = () => {
    const scores = Object.values(gradeData).filter((value): value is number => typeof value === 'number');
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  if (!canGradePlayers) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Player Grading - {event?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(90vh-120px)]">
          {/* Player Selection Sidebar */}
          <div className="w-80 border-r pr-4">
            <h3 className="font-semibold mb-4">Select Player to Grade</h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {allPlayers.map((player) => {
                  const existingGrade = getPlayerGrade(player.id);
                  const isSelected = selectedPlayer === player.id;
                  
                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedPlayer(player.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <p className="font-medium text-sm">
                              {player.profiles?.full_name || 'Unknown Player'}
                            </p>
                            {player.position && (
                              <p className="text-xs text-muted-foreground">
                                {player.position}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {player.jersey_number && (
                            <Badge variant="outline" className="text-xs">
                              #{player.jersey_number}
                            </Badge>
                          )}
                          {existingGrade && (
                            <Badge className={getGradeBadgeColor(existingGrade.overall_grade || 0)}>
                              {existingGrade.overall_grade?.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Grading Interface */}
          <div className="flex-1">
            {selectedPlayer ? (
              <div className="h-full flex flex-col">
                {/* Player Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {allPlayers.find(p => p.id === selectedPlayer)?.profiles?.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Overall Grade: <span className={getGradeColor(calculateOverallGrade())}>
                          {calculateOverallGrade().toFixed(1)}/10
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={handleSaveGrade}
                      disabled={saving}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Grade'}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-6">
                    {/* Skill Categories */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SKILL_CATEGORIES.map((skill) => {
                        const Icon = skill.icon;
                        const value = gradeData[skill.key as keyof GradeFormData] as number;
                        
                        return (
                          <Card key={skill.key} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${skill.color}`} />
                                <span className="font-medium text-sm">{skill.label}</span>
                              </div>
                              <Badge className={getGradeBadgeColor(value)}>
                                {value}/10
                              </Badge>
                            </div>
                            <Slider
                              value={[value]}
                              onValueChange={(newValue) => handleSliderChange(skill.key as keyof GradeFormData, newValue)}
                              max={10}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Needs Work</span>
                              <span>Average</span>
                              <span>Excellent</span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Notes Section */}
                    <Card className="p-4">
                      <h4 className="font-medium mb-3">Additional Notes</h4>
                      <Textarea
                        placeholder="Add any additional observations or feedback..."
                        value={gradeData.notes}
                        onChange={(e) => setGradeData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={4}
                      />
                    </Card>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Player</h3>
                  <p className="text-muted-foreground">
                    Choose a player from the list to start grading their performance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerGradingModal;