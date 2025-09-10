import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Target, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamStats {
  totalPlayers: number;
  averageAttendance: number;
  totalShots: number;
  averageShootingPercentage: number;
  totalGames: number;
  wins: number;
  losses: number;
  upcomingEvents: number;
}

interface TeamStatisticsTabProps {
  teamId: string;
}

const TeamStatisticsTab: React.FC<TeamStatisticsTabProps> = ({ teamId }) => {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamStatistics();
  }, [teamId]);

  const fetchTeamStatistics = async () => {
    try {
      setLoading(true);
      
      // Fetch player count
      const { data: playerTeams, error: playerError } = await supabase
        .from('player_teams')
        .select('player_id')
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (playerError) throw playerError;

      const playerIds = playerTeams?.map(pt => pt.player_id) || [];

      // Fetch attendance statistics
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('team_attendance')
        .select('attendance_percentage')
        .eq('team_id', teamId);

      if (attendanceError) throw attendanceError;

      // Fetch shot statistics for team players
      let totalShots = 0;
      let totalMakes = 0;
      
      if (playerIds.length > 0) {
        const { data: shotData, error: shotError } = await supabase
          .from('shots')
          .select('made')
          .in('player_id', playerIds);

        if (shotError) throw shotError;

        totalShots = shotData?.length || 0;
        totalMakes = shotData?.filter(shot => shot.made).length || 0;
      }

      // Fetch schedule data
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('event_type, start_time, status')
        .contains('team_ids', [teamId]);

      if (scheduleError) throw scheduleError;

      const games = scheduleData?.filter(s => s.event_type === 'game') || [];
      const upcomingEvents = scheduleData?.filter(s => 
        new Date(s.start_time) > new Date() && s.status === 'active'
      ).length || 0;

      const averageAttendance = attendanceData?.length > 0
        ? attendanceData.reduce((sum, att) => sum + att.attendance_percentage, 0) / attendanceData.length
        : 0;

      const averageShootingPercentage = totalShots > 0 ? (totalMakes / totalShots) * 100 : 0;

      setStats({
        totalPlayers: playerIds.length,
        averageAttendance,
        totalShots,
        averageShootingPercentage,
        totalGames: games.length,
        wins: 0, // This would need game results data
        losses: 0, // This would need game results data
        upcomingEvents
      });

    } catch (error) {
      console.error('Error fetching team statistics:', error);
      toast({
        title: "Error",
        description: "Failed to load team statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Unable to load team statistics.</p>
        </CardContent>
      </Card>
    );
  }

  const winPercentage = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Team Statistics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Team Size */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Players</p>
                <p className="text-2xl font-bold">{stats.totalPlayers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Attendance</p>
                <Badge variant="outline">{Math.round(stats.averageAttendance)}%</Badge>
              </div>
              <Progress value={stats.averageAttendance} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Shooting Statistics */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Shooting %</p>
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{Math.round(stats.averageShootingPercentage)}%</p>
              <p className="text-xs text-muted-foreground">{stats.totalShots} total shots</p>
            </div>
          </CardContent>
        </Card>

        {/* Game Record */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <Award className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{Math.round(winPercentage)}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.wins}W - {stats.losses}L ({stats.totalGames} games)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Performance Trend */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Performance</p>
              <div className="flex items-center gap-2">
                {stats.averageAttendance > 80 && stats.averageShootingPercentage > 40 ? (
                  <Badge className="bg-green-500">Excellent</Badge>
                ) : stats.averageAttendance > 60 && stats.averageShootingPercentage > 30 ? (
                  <Badge className="bg-yellow-500">Good</Badge>
                ) : (
                  <Badge className="bg-red-500">Needs Improvement</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Attendance Rate</span>
            <div className="flex items-center gap-2">
              <Progress value={stats.averageAttendance} className="w-20 h-2" />
              <span className="text-sm font-medium">{Math.round(stats.averageAttendance)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Shooting Accuracy</span>
            <div className="flex items-center gap-2">
              <Progress value={stats.averageShootingPercentage} className="w-20 h-2" />
              <span className="text-sm font-medium">{Math.round(stats.averageShootingPercentage)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamStatisticsTab;