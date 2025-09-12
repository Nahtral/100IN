import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, Target, Activity, Users, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlayerGoalData {
  player_id: string;
  player_name: string;
  goal_type: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  priority: number;
  is_active: boolean;
}

interface PlayerPerformanceData {
  player_id: string;
  player_name: string;
  recent_performance: number;
  performance_trend: 'up' | 'down' | 'stable';
  last_activity: string;
  fitness_score: number;
  shooting_percentage: number;
}

export const PlayerMonitoringDashboard: React.FC = () => {
  const [playersGoals, setPlayersGoals] = useState<PlayerGoalData[]>([]);
  const [playersPerformance, setPlayersPerformance] = useState<PlayerPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);

      // Fetch all active goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('development_goals')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Get unique player IDs
      const playerIds = [...new Set(goalsData?.map(goal => goal.player_id).filter(Boolean))];
      
      // Fetch players and their profiles
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, user_id')
        .in('id', playerIds);

      if (playersError) throw playersError;

      const userIds = [...new Set(playersData?.map(player => player.user_id).filter(Boolean))];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create lookup maps
      const playersMap = (playersData || []).reduce((acc, player) => {
        acc[player.id] = player;
        return acc;
      }, {} as { [key: string]: any });

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as { [key: string]: any });

      // Transform goals data
      const transformedGoals: PlayerGoalData[] = (goalsData || []).map(goal => {
        const player = playersMap[goal.player_id];
        const profile = player ? profilesMap[player.user_id] : null;
        
        return {
          player_id: goal.player_id,
          player_name: profile?.full_name || 'Unknown Player',
          goal_type: goal.goal_type,
          metric_name: goal.metric_name,
          target_value: goal.target_value,
          current_value: goal.current_value,
          progress_percentage: goal.target_value > 0 
            ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100)
            : 0,
          priority: goal.priority,
          is_active: goal.is_active
        };
      });

      setPlayersGoals(transformedGoals);

      // Fetch recent performance data
      const { data: performanceData, error: performanceError } = await supabase
        .from('player_performance')
        .select(`
          *,
          players!inner(
            user_id,
            profiles!inner(full_name)
          )
        `)
        .order('game_date', { ascending: false })
        .limit(100);

      if (performanceError) throw performanceError;

      // Group performance by player and calculate trends
      const playerPerformanceMap = new Map();
      
      (performanceData || []).forEach(perf => {
        const playerId = perf.player_id;
        if (!playerPerformanceMap.has(playerId)) {
          playerPerformanceMap.set(playerId, {
            player_id: playerId,
            player_name: perf.players?.profiles?.full_name || 'Unknown Player',
            performances: [],
            last_activity: perf.game_date,
            fitness_score: 0,
            shooting_percentage: 0
          });
        }
        
        const playerData = playerPerformanceMap.get(playerId);
        playerData.performances.push(perf);
        if (perf.game_date > playerData.last_activity) {
          playerData.last_activity = perf.game_date;
        }
      });

      // Calculate performance metrics for each player
      const transformedPerformance: PlayerPerformanceData[] = Array.from(playerPerformanceMap.values())
        .map(player => {
          const recent = player.performances.slice(0, 5);
          const older = player.performances.slice(5, 10);
          
          const recentAvg = recent.length > 0 
            ? recent.reduce((sum: number, p: any) => sum + (p.points || 0), 0) / recent.length
            : 0;
          
          const olderAvg = older.length > 0 
            ? older.reduce((sum: number, p: any) => sum + (p.points || 0), 0) / older.length
            : recentAvg;

          const shootingPercentage = player.performances.length > 0
            ? player.performances.reduce((sum: number, p: any) => {
                return sum + (p.field_goals_attempted > 0 
                  ? (p.field_goals_made / p.field_goals_attempted) * 100 
                  : 0);
              }, 0) / player.performances.length
            : 0;

          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (recentAvg > olderAvg * 1.1) trend = 'up';
          else if (recentAvg < olderAvg * 0.9) trend = 'down';

          return {
            player_id: player.player_id,
            player_name: player.player_name,
            recent_performance: Math.round(recentAvg),
            performance_trend: trend,
            last_activity: player.last_activity,
            fitness_score: 85, // Would come from health check-ins
            shooting_percentage: Math.round(shootingPercentage)
          };
        });

      setPlayersPerformance(transformedPerformance);

      // Generate notifications for achievements and alerts
      const newNotifications: string[] = [];
      
      transformedGoals.forEach(goal => {
        if (goal.progress_percentage >= 100) {
          newNotifications.push(`🎉 ${goal.player_name} achieved their ${goal.goal_type} goal!`);
        } else if (goal.progress_percentage < 50) {
          newNotifications.push(`⚠️ ${goal.player_name} needs attention on ${goal.goal_type} goal (${goal.progress_percentage}% complete)`);
        }
      });

      transformedPerformance.forEach(player => {
        if (player.performance_trend === 'down') {
          newNotifications.push(`📉 ${player.player_name} showing declining performance trend`);
        } else if (player.performance_trend === 'up') {
          newNotifications.push(`📈 ${player.player_name} showing improving performance!`);
        }
      });

      setNotifications(newNotifications);

    } catch (error) {
      console.error('Error fetching player data:', error);
      toast.error('Failed to load player monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerData();

    // Set up real-time subscriptions
    const goalsChannel = supabase
      .channel('goals-monitoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'development_goals' },
        () => fetchPlayerData()
      )
      .subscribe();

    const performanceChannel = supabase
      .channel('performance-monitoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'player_performance' },
        () => fetchPlayerData()
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchPlayerData, 30000);

    return () => {
      supabase.removeChannel(goalsChannel);
      supabase.removeChannel(performanceChannel);
      clearInterval(interval);
    };
  }, []);

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'shooting_percentage': return <Target className="h-4 w-4" />;
      case 'fitness_score': return <Activity className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading player monitoring data...</div>;
  }

  // Group goals by player
  const goalsByPlayer = playersGoals.reduce((acc, goal) => {
    if (!acc[goal.player_id]) acc[goal.player_id] = [];
    acc[goal.player_id].push(goal);
    return acc;
  }, {} as Record<string, PlayerGoalData[]>);

  return (
    <div className="space-y-6">
      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Live Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notification, index) => (
                <div key={index} className="p-2 bg-muted rounded-lg text-sm">
                  {notification}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active Players</span>
            </div>
            <div className="text-2xl font-bold">{playersPerformance.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active Goals</span>
            </div>
            <div className="text-2xl font-bold">{playersGoals.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Goals Achieved</span>
            </div>
            <div className="text-2xl font-bold">
              {playersGoals.filter(g => g.progress_percentage >= 100).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Need Attention</span>
            </div>
            <div className="text-2xl font-bold">
              {playersGoals.filter(g => g.progress_percentage < 50).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Goals Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Player Goals Progress</CardTitle>
            <CardDescription>Real-time tracking of all player development goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(goalsByPlayer).map(([playerId, playerGoals]) => (
                <div key={playerId} className="border rounded-lg p-3 space-y-2">
                  <h4 className="font-medium">{playerGoals[0].player_name}</h4>
                  {playerGoals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getGoalTypeIcon(goal.goal_type)}
                        <span className="flex-1">{goal.metric_name}</span>
                        <Badge variant={getPriorityColor(goal.priority.toString()) as any}>
                          Priority {goal.priority}
                        </Badge>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-medium">{goal.progress_percentage}%</div>
                        <Progress value={goal.progress_percentage} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Recent performance analysis and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {playersPerformance.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{player.player_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Last active: {new Date(player.last_activity).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{player.recent_performance}</div>
                      <div className="text-muted-foreground">Avg Points</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{player.shooting_percentage}%</div>
                      <div className="text-muted-foreground">FG%</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{player.fitness_score}</div>
                      <div className="text-muted-foreground">Fitness</div>
                    </div>
                    {getTrendIcon(player.performance_trend)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={fetchPlayerData} variant="outline">
          <Bell className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
        <Button onClick={() => toast.success('Notifications sent to coaches!')}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Send Alerts
        </Button>
      </div>
    </div>
  );
};