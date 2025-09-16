import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { EnhancedSlider } from '@/components/ui/enhanced-slider';
import { 
  Save, 
  User, 
  Trophy, 
  Target, 
  Users, 
  MessageSquare, 
  Zap, 
  Brain, 
  Eye,
  Settings,
  RotateCcw,
  TrendingUp
} from 'lucide-react';
import { useEventGrades, GradeFormData, EventPlayerGrade } from '@/hooks/useEventGrades';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';

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
  { key: 'shooting', label: 'Shooting', icon: Target, color: 'text-panthers-red', priority: 'high' },
  { key: 'ball_handling', label: 'Ball Handling', icon: Zap, color: 'text-panther-gold', priority: 'high' },
  { key: 'passing', label: 'Passing', icon: Users, color: 'text-deep-teal', priority: 'high' },
  { key: 'rebounding', label: 'Rebounding', icon: Trophy, color: 'text-panther-blue', priority: 'high' },
  { key: 'footwork', label: 'Footwork', icon: Target, color: 'text-panthers-red', priority: 'medium' },
  { key: 'decision_making', label: 'Decision Making', icon: Brain, color: 'text-panther-gold', priority: 'high' },
  { key: 'consistency', label: 'Consistency', icon: Target, color: 'text-deep-teal', priority: 'medium' },
  { key: 'communication', label: 'Communication', icon: MessageSquare, color: 'text-panther-blue', priority: 'medium' },
  { key: 'cutting', label: 'Cutting', icon: Zap, color: 'text-panthers-red', priority: 'medium' },
  { key: 'teammate_support', label: 'Teammate Support', icon: Users, color: 'text-panther-gold', priority: 'medium' },
  { key: 'competitiveness', label: 'Competitiveness', icon: Trophy, color: 'text-deep-teal', priority: 'medium' },
  { key: 'coachable', label: 'Coachable', icon: MessageSquare, color: 'text-panther-blue', priority: 'high' },
  { key: 'leadership', label: 'Leadership', icon: Users, color: 'text-panthers-red', priority: 'medium' },
  { key: 'reaction_time', label: 'Reaction Time', icon: Zap, color: 'text-panther-gold', priority: 'medium' },
  { key: 'game_iq', label: 'Game IQ', icon: Brain, color: 'text-deep-teal', priority: 'high' },
  { key: 'boxout_frequency', label: 'Boxout Frequency', icon: Target, color: 'text-panther-blue', priority: 'low' },
  { key: 'court_vision', label: 'Court Vision', icon: Eye, color: 'text-panthers-red', priority: 'medium' }
] as const;

const EnhancedPlayerGradingModal: React.FC<PlayerGradingModalProps> = ({
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
  
  // UI Preferences
  const [showAlternativeInputs, setShowAlternativeInputs] = useState(true);
  const [showPresetButtons, setShowPresetButtons] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [filterByPriority, setFilterByPriority] = useState('all');

  // Check if user can grade players
  const canGradePlayers = isSuperAdmin() || hasRole('coach') || hasRole('staff');

  // Get all players from all teams
  const allPlayers = teams.flatMap(team => team.players);

  // Filter skills by priority
  const getFilteredSkills = () => {
    if (filterByPriority === 'all') return SKILL_CATEGORIES;
    return SKILL_CATEGORIES.filter(skill => skill.priority === filterByPriority);
  };

  // Load existing grade when player is selected
  useEffect(() => {
    if (selectedPlayer) {
      const existingGrade = getPlayerGrade(selectedPlayer);
if (existingGrade) {
        const metrics = (existingGrade as any)?.metrics || {};
        const newGradeData = {
          shooting: metrics.shooting ?? 5,
          ball_handling: metrics.ball_handling ?? 5,
          passing: metrics.passing ?? 5,
          rebounding: metrics.rebounding ?? 5,
          footwork: metrics.footwork ?? 5,
          decision_making: metrics.decision_making ?? 5,
          consistency: metrics.consistency ?? 5,
          communication: metrics.communication ?? 5,
          cutting: metrics.cutting ?? 5,
          teammate_support: metrics.teammate_support ?? 5,
          competitiveness: metrics.competitiveness ?? 5,
          coachable: metrics.coachable ?? 5,
          leadership: metrics.leadership ?? 5,
          reaction_time: metrics.reaction_time ?? 5,
          game_iq: metrics.game_iq ?? 5,
          boxout_frequency: metrics.boxout_frequency ?? 5,
          court_vision: metrics.court_vision ?? 5,
          notes: metrics.notes ?? ''
        };
        setGradeData(newGradeData);
      } else {
        // Reset to default values for new grade
        const defaultGradeData = {
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
        };
        setGradeData(defaultGradeData);
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
        toast.success("Grade updated successfully!");
      } else {
        await submitGrade(selectedPlayer, gradeData);
        toast.success("Grade saved successfully!");
      }
    } catch (error) {
      toast.error("Failed to save grade. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    const defaultGradeData = {
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
    };
    setGradeData(defaultGradeData);
    toast.info("Grades reset to default values");
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

  const getProgressValue = () => {
    return (calculateOverallGrade() / 10) * 100;
  };

  if (!canGradePlayers) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Enhanced Player Grading - {event?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(95vh-120px)]">
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
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 mobile-card ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-soft' 
                          : 'border-border hover:border-primary/50 hover:shadow-soft'
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
                              <Badge className={getGradeBadgeColor((existingGrade as any).overall || 0)}>
                                {(existingGrade as any).overall?.toFixed(1)}
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
                {/* Player Header with Settings */}
                <div className="mb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {allPlayers.find(p => p.id === selectedPlayer)?.profiles?.full_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-muted-foreground">
                          Overall Grade: <span className={getGradeColor(calculateOverallGrade())}>
                            {calculateOverallGrade().toFixed(1)}/10
                          </span>
                        </p>
                        <Progress value={getProgressValue()} className="w-32 h-2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetToDefault}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </Button>
                      <Button
                        onClick={handleSaveGrade}
                        disabled={saving}
                        className="gap-2 mobile-btn"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Grade'}
                      </Button>
                    </div>
                  </div>

                  {/* Settings Panel */}
                  <Card className="p-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="alternative-inputs"
                          checked={showAlternativeInputs}
                          onCheckedChange={setShowAlternativeInputs}
                        />
                        <Label htmlFor="alternative-inputs" className="text-sm">
                          Alternative Inputs
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="preset-buttons"
                          checked={showPresetButtons}
                          onCheckedChange={setShowPresetButtons}
                        />
                        <Label htmlFor="preset-buttons" className="text-sm">
                          Preset Buttons
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="compact-mode"
                          checked={compactMode}
                          onCheckedChange={setCompactMode}
                        />
                        <Label htmlFor="compact-mode" className="text-sm">
                          Compact Mode
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Label htmlFor="priority-filter" className="text-sm">
                          Priority:
                        </Label>
                        <select
                          id="priority-filter"
                          value={filterByPriority}
                          onChange={(e) => setFilterByPriority(e.target.value)}
                          className="px-2 py-1 text-sm border rounded"
                        >
                          <option value="all">All</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                  </Card>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-6">
                    {/* Skill Categories */}
                    <div className={`grid gap-4 ${compactMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      {getFilteredSkills().map((skill) => {
                        const Icon = skill.icon;
                        const value = gradeData[skill.key as keyof GradeFormData] as number;
                        
                        return (
                          <Card key={skill.key} className={`mobile-card ${compactMode ? 'p-3' : 'p-4'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${skill.color}`} />
                                <span className={`font-medium ${compactMode ? 'text-sm' : 'text-sm'}`}>
                                  {skill.label}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {skill.priority}
                                </Badge>
                              </div>
                              <Badge className={getGradeBadgeColor(value)}>
                                {value}/10
                              </Badge>
                            </div>
                            <EnhancedSlider
                              value={[value]}
                              onValueChange={(newValue) => handleSliderChange(skill.key as keyof GradeFormData, newValue)}
                              max={10}
                              min={1}
                              step={1}
                              showAlternativeInputs={showAlternativeInputs}
                              showPresetButtons={showPresetButtons}
                              className="w-full"
                            />
                          </Card>
                        );
                      })}
                    </div>

                    {/* Notes Section */}
                    <Card className="mobile-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Additional Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Add any additional observations, areas for improvement, or specific feedback..."
                          value={gradeData.notes}
                          onChange={(e) => setGradeData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={4}
                          className="mobile-textarea"
                        />
                      </CardContent>
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

export default EnhancedPlayerGradingModal;