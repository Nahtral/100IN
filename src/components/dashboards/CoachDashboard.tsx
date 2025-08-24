
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Trophy, 
  Activity, 
  Target,
  TrendingUp,
  Clock,
  Zap
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpcomingSchedule } from "@/hooks/useDashboardData";

const CoachDashboard = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const [coachData, setCoachData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { schedule } = useUpcomingSchedule();

  useEffect(() => {
    const fetchCoachData = async () => {
      if (!user) return;
      
      try {
        // Get coach's teams
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name')
          .eq('coach_id', user.id);

        if (!teams || teams.length === 0) {
          setCoachData({ teams: [], activePlayers: 0, wins: 0, avgScore: 0, nextGame: 0 });
          setLoading(false);
          return;
        }

        const teamIds = teams.map(t => t.id);

        // Get active players for coach's teams
        const { data: players } = await supabase
          .from('players')
          .select('id, team_id')
          .in('team_id', teamIds)
          .eq('is_active', true);

        // Get team performance data
        const { data: gameData } = await supabase
          .from('game_logs')
          .select('result, points, game_date, player_id')
          .in('player_id', (players || []).map(p => p.id));

        // Calculate stats
        const wins = gameData?.filter(g => g.result === 'W').length || 0;
        const totalPoints = gameData?.reduce((sum, g) => sum + (g.points || 0), 0) || 0;
        const avgScore = gameData?.length ? (totalPoints / gameData.length).toFixed(1) : '0.0';

        // Get upcoming games from schedule
        const nextGameDays = schedule.length > 0 ? 
          Math.ceil((new Date(schedule[0]?.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

        // Get top performers
        const playerStats = (players || []).map(player => {
          const playerGames = gameData?.filter(g => g.player_id === player.id) || [];
          const avgPoints = playerGames.length ? 
            (playerGames.reduce((sum, g) => sum + (g.points || 0), 0) / playerGames.length).toFixed(1) : '0.0';
          return { ...player, avgPoints: parseFloat(avgPoints) };
        }).sort((a, b) => b.avgPoints - a.avgPoints).slice(0, 3);

        setCoachData({
          teams,
          activePlayers: players?.length || 0,
          wins,
          avgScore,
          nextGame: Math.max(0, nextGameDays),
          topPerformers: playerStats
        });
      } catch (error) {
        console.error('Error fetching coach data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, [user, schedule]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard data...</div>;
  }
  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'Coach',
      role: userRole || 'Coach',
      avatar: '' 
    }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Coach Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || 'Coach'}! Manage your team.
            </p>
          </div>
        </div>
        {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coachData.activePlayers}</div>
            <p className="text-xs text-muted-foreground">
              {coachData.teams?.length > 0 ? coachData.teams[0].name : 'No team assigned'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wins</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coachData.wins}</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coachData.avgScore}</div>
            <p className="text-xs text-muted-foreground">
              Points per game
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Game</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coachData.nextGame}</div>
            <p className="text-xs text-muted-foreground">
              Days away
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Team Performance
            </CardTitle>
            <CardDescription>
              Current season statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Win Rate</span>
                <span className="text-lg font-bold text-green-600">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Team Chemistry</span>
                <span className="text-lg font-bold text-blue-600">88%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '88%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Fitness Level</span>
                <span className="text-lg font-bold text-orange-600">82%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '82%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Player Highlights
            </CardTitle>
            <CardDescription>
              Top performers this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {coachData.topPerformers?.length > 0 ? coachData.topPerformers.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                 <div>
                   <p className="font-medium">Player #{player.id}</p>
                   <p className="text-sm text-gray-600">{player.avgPoints} PPG</p>
                 </div>
                 <Badge variant="outline" className="text-green-600 border-green-200">
                   Top Performer
                 </Badge>
               </div>
             )) : (
               <p className="text-center text-muted-foreground py-4">No player performance data available</p>
             )}
             <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
               View All Players
             </Button>
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
            Practices and games this week
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
             {schedule.length > 0 ? schedule.map((item, index) => (
               <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-orange-200 transition-colors">
                 <div className="text-center min-w-[80px]">
                   <p className="text-sm font-medium text-gray-600">{new Date(item.start_time).toLocaleDateString()}</p>
                   <p className="text-xs text-gray-500">{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center gap-2">
                     <p className="font-medium">{item.title}</p>
                     <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                       {item.event_type || 'event'}
                     </Badge>
                   </div>
                   <p className="text-sm text-gray-600">{item.location || 'TBD'} • {item.description || 'No description'}</p>
                 </div>
                 <Calendar className="h-5 w-5 text-blue-500" />
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

export default CoachDashboard;
