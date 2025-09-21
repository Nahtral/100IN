import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EnhancedPlayerAnalytics } from '@/hooks/useEnhancedAnalytics';
import { User, Target, Heart, Calendar } from 'lucide-react';

interface PlayerDetailModalProps {
  player: EnhancedPlayerAnalytics | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  isOpen,
  onClose
}) => {
  if (!player) return null;

  const getPerformanceBadgeVariant = (level: string) => {
    switch (level) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'needs_improvement': return 'outline';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            {player.player_name}
            {player.jersey_number && (
              <Badge variant="outline">#{player.jersey_number}</Badge>
            )}
            {player.team_name && (
              <Badge variant="secondary">{player.team_name}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Overall Grade</span>
                    <span className="font-semibold">{player.performance_data.avg_overall_grade || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Evaluations</span>
                    <span>{player.performance_data.total_evaluations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Performance Level</span>
                    <Badge variant={getPerformanceBadgeVariant(player.performance_data.performance_level)}>
                      {player.performance_data.performance_level}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Evaluation</span>
                    <span>{formatDate(player.performance_data.last_evaluation_date)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Shooting</span>
                      <span className="text-sm">{player.performance_data.avg_shooting}/10</span>
                    </div>
                    <Progress value={(player.performance_data.avg_shooting || 0) * 10} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Passing</span>
                      <span className="text-sm">{player.performance_data.avg_passing}/10</span>
                    </div>
                    <Progress value={(player.performance_data.avg_passing || 0) * 10} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Dribbling</span>
                      <span className="text-sm">{player.performance_data.avg_dribbling}/10</span>
                    </div>
                    <Progress value={(player.performance_data.avg_dribbling || 0) * 10} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Defense</span>
                      <span className="text-sm">{player.performance_data.avg_defense}/10</span>
                    </div>
                    <Progress value={(player.performance_data.avg_defense || 0) * 10} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Health & Wellness
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Check-ins</span>
                    <span className="font-semibold">{player.health_data.total_checkins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Injuries</span>
                    <Badge variant={player.health_data.active_injuries > 0 ? 'destructive' : 'default'}>
                      {player.health_data.active_injuries}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fitness Score</span>
                    <span>{player.health_data.avg_fitness_score || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Check-in</span>
                    <span>{formatDate(player.health_data.last_checkin_date)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Energy Level</span>
                      <span className="text-sm">{player.health_data.avg_energy_level}/10</span>
                    </div>
                    <Progress value={(player.health_data.avg_energy_level || 0) * 10} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Sleep Quality</span>
                      <span className="text-sm">{player.health_data.avg_sleep_quality}/10</span>
                    </div>
                    <Progress value={(player.health_data.avg_sleep_quality || 0) * 10} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Training Readiness</span>
                      <span className="text-sm">{player.health_data.avg_training_readiness}/10</span>
                    </div>
                    <Progress value={(player.health_data.avg_training_readiness || 0) * 10} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Attendance Record
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Events</span>
                    <span className="font-semibold">{player.attendance_data.total_events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Attendance Rate</span>
                    <Badge variant={player.attendance_data.attendance_percentage >= 80 ? 'default' : 'destructive'}>
                      {player.attendance_data.attendance_percentage}%
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Present</span>
                    <span className="text-green-600">{player.attendance_data.present_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Late</span>
                    <span className="text-yellow-600">{player.attendance_data.late_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Absent</span>
                    <span className="text-red-600">{player.attendance_data.absent_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Excused</span>
                    <span className="text-blue-600">{player.attendance_data.excused_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};