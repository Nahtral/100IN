import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, 
  User, 
  Trophy, 
  Target, 
  Users, 
  MessageSquare, 
  Zap, 
  Brain, 
  Shield,
  Footprints,
  RotateCcw,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { usePlayerGrading } from '@/hooks/usePlayerGrading';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useToast } from '@/hooks/use-toast';

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

const RealTimePlayerGradingModal: React.FC<PlayerGradingModalProps> = ({
  isOpen,
  onClose,
  event,
  teams
}) => {
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const { toast } = useToast();
  
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  // UI Preferences
  const [showAlternativeInputs, setShowAlternativeInputs] = useState(true);
  const [showPresetButtons, setShowPresetButtons] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [filterByPriority, setFilterByPriority] = useState('all');

  // Use the new grading hook
  const {
    metrics,
    gradeData,
    overallGrade,
    loading,
    saving,
    updateGrade,
    resetGrades
  } = usePlayerGrading(event?.id, selectedPlayer || undefined);

  // Check if user can grade players
  const canGradePlayers = isSuperAdmin() || hasRole('coach') || hasRole('staff');

  // Get all players from all teams
  const allPlayers = teams.flatMap(team => team.players);

  // Filter metrics by priority
  const getFilteredMetrics = () => {
    if (filterByPriority === 'all') return metrics;
    return metrics.filter(metric => {
      // Map metric names to priorities (this could come from DB in future)
      const priorities: Record<string, string> = {
        'Shooting': 'high',
        'Ball Handling': 'high',
        'Passing': 'high',
        'Rebounding': 'high',
        'Decision Making': 'high',
        'Footwork': 'medium',
        'Consistency': 'medium',
        'Communication': 'medium'
      };
      return priorities[metric.name] === filterByPriority;
    });
  };

  // Get metric icon
  const getMetricIcon = (metricName: string) => {
    const iconMap: Record<string, any> = {
      'Shooting': Target,
      'Ball Handling': Zap,
      'Passing': Users,
      'Rebounding': Trophy,
      'Footwork': Footprints,
      'Decision Making': Brain,
      'Consistency': Target,
      'Communication': MessageSquare
    };
    return iconMap[metricName] || Target;
  };

  // Get metric color
  const getMetricColor = (metricName: string) => {
    const colorMap: Record<string, string> = {
      'Shooting': 'text-panthers-red',
      'Ball Handling': 'text-panther-gold',
      'Passing': 'text-deep-teal',
      'Rebounding': 'text-panther-blue',
      'Footwork': 'text-panthers-red',
      'Decision Making': 'text-panther-gold',
      'Consistency': 'text-deep-teal',
      'Communication': 'text-panther-blue'
    };
    return colorMap[metricName] || 'text-foreground';
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

  const getProgressValue = () => {
    return overallGrade ? (overallGrade / 10) * 100 : 0;
  };

  // Handle slider and input changes
  const handleSliderChange = (metricId: string, value: number[]) => {
    updateGrade(metricId, value[0]);
  };

  const handleInputChange = (metricId: string, value: string) => {
    const numValue = Math.max(0, Math.min(10, parseFloat(value) || 0));
    updateGrade(metricId, numValue);
  };

  // Get priority level for metric
  const getMetricPriority = (metricName: string) => {
    const priorities: Record<string, string> = {
      'Shooting': 'high',
      'Ball Handling': 'high',
      'Passing': 'high',
      'Rebounding': 'high',
      'Decision Making': 'high',
      'Footwork': 'medium',
      'Consistency': 'medium',
      'Communication': 'medium'
    };
    return priorities[metricName] || 'medium';
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
            {saving && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Saving...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(95vh-120px)]">
          {/* Player Selection Sidebar */}
          <div className="w-80 border-r pr-4">
            <h3 className="font-semibold mb-4">Select Player to Grade</h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {allPlayers.map((player) => {
                  const isSelected = selectedPlayer === player.user_id;
                  
                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 mobile-card ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-soft' 
                          : 'border-border hover:border-primary/50 hover:shadow-soft'
                      }`}
                      onClick={() => setSelectedPlayer(player.user_id)}
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
                          {isSelected && overallGrade && (
                            <Badge className={getGradeBadgeColor(overallGrade)}>
                              {overallGrade.toFixed(1)}
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
                        {allPlayers.find(p => p.user_id === selectedPlayer)?.profiles?.full_name}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-muted-foreground">
                          Overall Grade: <span className={overallGrade ? getGradeColor(overallGrade) : ''}>
                            {overallGrade?.toFixed(1) || '0.0'}/10
                          </span>
                        </p>
                        <Progress value={getProgressValue()} className="w-32 h-2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetGrades}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset
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

                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading grading data...</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="space-y-6">
                      {/* Skill Categories */}
                      <div className={`grid gap-4 ${compactMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {getFilteredMetrics().map((metric) => {
                          const Icon = getMetricIcon(metric.name);
                          const value = gradeData[metric.id]?.score || 5;
                          const priority = getMetricPriority(metric.name);
                          
                          return (
                            <Card key={metric.id} className={`mobile-card ${compactMode ? 'p-3' : 'p-4'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${getMetricColor(metric.name)}`} />
                                  <span className={`font-medium ${compactMode ? 'text-sm' : 'text-sm'}`}>
                                    {metric.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {priority}
                                  </Badge>
                                </div>
                                <Badge className={getGradeBadgeColor(value)}>
                                  {value}/10
                                </Badge>
                              </div>
                              
                              <div className="space-y-3">
                                {/* Slider */}
                                <Slider
                                  value={[value]}
                                  onValueChange={(newValue) => handleSliderChange(metric.id, newValue)}
                                  max={10}
                                  min={0}
                                  step={0.5}
                                  className="w-full"
                                />
                                
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Needs Work</span>
                                  <span>Average</span>
                                  <span>Excellent</span>
                                </div>
                                
                                {/* Alternative Input */}
                                {showAlternativeInputs && (
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSliderChange(metric.id, [Math.max(0, value - 0.5)])}
                                    >
                                      -
                                    </Button>
                                    <Input
                                      type="number"
                                      value={value}
                                      onChange={(e) => handleInputChange(metric.id, e.target.value)}
                                      min="0"
                                      max="10"
                                      step="0.5"
                                      className="w-16 text-center"
                                    />
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSliderChange(metric.id, [Math.min(10, value + 0.5)])}
                                    >
                                      +
                                    </Button>
                                  </div>
                                )}
                                
                                {/* Preset Buttons */}
                                {showPresetButtons && (
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSliderChange(metric.id, [2])}
                                    >
                                      Poor
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSliderChange(metric.id, [5])}
                                    >
                                      Avg
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleSliderChange(metric.id, [8])}
                                    >
                                      Great
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Player</h3>
                  <p className="text-muted-foreground">
                    Choose a player from the sidebar to start grading their performance.
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

export default RealTimePlayerGradingModal;