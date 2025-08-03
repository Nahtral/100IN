
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Calendar, 
  Target, 
  TrendingUp,
  Heart,
  Trophy,
  Clock,
  User
} from "lucide-react";
import { usePlayerPerformance, useUpcomingSchedule } from "@/hooks/useDashboardData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const PlayerDashboard = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const [playerData, setPlayerData] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const { performance, loading: performanceLoading } = usePlayerPerformance(playerData?.id);
  const { schedule } = useUpcomingSchedule(playerData?.team_id);

  useEffect(() => {
    const fetchPlayerData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: player } = await supabase
        .from('players')
        .select('*, teams(name)')
        .eq('user_id', user.id)
        .single();

      if (player) {
        setPlayerData(player);

        // Calculate player stats from performance data
        const { data: performanceData } = await supabase
          .from('player_performance')
          .select('*')
          .eq('player_id', player.id);

        if (performanceData && performanceData.length > 0) {
          const totalPoints = performanceData.reduce((sum, game) => sum + (game.points || 0), 0);
          const avgPoints = totalPoints / performanceData.length;
          const gamesPlayed = performanceData.length;

          setPlayerStats({
            avgPoints: avgPoints.toFixed(1),
            gamesPlayed,
            fitnessScore: 85, // This would come from health_wellness table
            teamRank: 3 // This would be calculated based on team performance
          });
        }
      }
    };

    fetchPlayerData();
  }, []);

  if (!playerData) {
    return <div className="flex items-center justify-center p-8">Loading player data...</div>;
  }
  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'Player',
      role: userRole || 'Player',
      avatar: '' 
    }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Player Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || 'Player'}! Track your performance.
            </p>
          </div>
        </div>
        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Points</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playerStats?.avgPoints || '0.0'}</div>
              <p className="text-xs text-muted-foreground">
                Per game this season
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Games Played</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playerStats?.gamesPlayed || 0}</div>
              <p className="text-xs text-muted-foreground">
                This season
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fitness Score</CardTitle>
              <Heart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playerStats?.fitnessScore || 0}</div>
              <p className="text-xs text-muted-foreground">
                Out of 100
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Rank</CardTitle>
              <Trophy className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{playerStats?.teamRank || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                On team leaderboard
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Recent Performance
              </CardTitle>
              <CardDescription>
                Your last 5 games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performance.length > 0 ? performance.map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">vs {game.opponent || 'TBD'}</p>
                      <p className="text-sm text-gray-600">{game.points || 0} pts, {game.rebounds || 0} reb, {game.assists || 0} ast</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{new Date(game.game_date).toLocaleDateString()}</p>
                      <Badge variant="outline">
                        {game.points >= 15 ? 'Good' : 'Average'}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-4">No performance data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Development Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" />
                Development Goals
              </CardTitle>
              <CardDescription>
                Areas for improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Free Throw %</span>
                    <span className="font-medium">72% → 85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: '72%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Defense Rating</span>
                    <span className="font-medium">B → A</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Assist Average</span>
                    <span className="font-medium">4.2 → 6.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '70%'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Upcoming Schedule
            </CardTitle>
            <CardDescription>
              Your next events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.length > 0 ? schedule.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{new Date(item.start_time).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{new Date(item.start_time).toLocaleTimeString()}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PlayerDashboard;
