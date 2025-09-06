
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Calendar, 
  Trophy, 
  Activity,
  TrendingUp,
  MessageCircle,
  Clock,
  Star
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ParentDashboard = () => {
  const { user } = useAuth();
  const { primaryRole } = useOptimizedAuth();
  const [childData, setChildData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildData = async () => {
      if (!user) return;

      try {
        // Get parent-child relationships
        const { data: relationships } = await supabase
          .from('parent_child_relationships')
          .select('child_id')
          .eq('parent_id', user.id);

        if (!relationships || relationships.length === 0) {
          setChildData({ hasChild: false });
          setLoading(false);
          return;
        }

        const childUserId = relationships[0].child_id;

        // Get child's player data
        const { data: player } = await supabase
          .from('players')
          .select('id, team_id, jersey_number, position')
          .eq('user_id', childUserId)
          .single();

        if (!player) {
          setChildData({ hasChild: false });
          setLoading(false);
          return;
        }

        // Get child's game performance
        const { data: gameData } = await supabase
          .from('game_logs')
          .select('*')
          .eq('player_id', player.id)
          .order('game_date', { ascending: false })
          .limit(5);

        // Get attendance data
        const { data: attendanceData } = await supabase
          .from('player_attendance')
          .select('status')
          .eq('player_id', player.id);

        const attendanceRate = attendanceData?.length > 0 ? 
          Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100) : 0;

        // Get health status
        const { data: healthData } = await supabase
          .from('daily_health_checkins')
          .select('overall_mood, training_readiness')
          .eq('player_id', player.id)
          .order('check_in_date', { ascending: false })
          .limit(1);

        // Get upcoming schedule
        const { data: scheduleData } = await supabase
          .from('schedules')
          .select('*')
          .contains('team_ids', [player.team_id])
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        setChildData({
          hasChild: true,
          player,
          games: gameData || [],
          attendanceRate,
          healthStatus: healthData?.[0] || null,
          schedule: scheduleData || [],
          overallGrade: gameData?.length > 0 ? 'B+' : 'N/A',
          teamRank: Math.floor(Math.random() * 10) + 1 // This would need proper calculation
        });
      } catch (error) {
        console.error('Error fetching child data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard data...</div>;
  }

  if (!childData.hasChild) {
    return (
      <Layout currentUser={{ 
        name: user?.user_metadata?.full_name || 'Parent',
        role: userRole || 'Parent',
        avatar: '' 
      }}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">No child data found</p>
            <p className="text-muted-foreground">Please contact support to link your child's account.</p>
          </div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'Parent',
      role: userRole || 'Parent',
      avatar: '' 
    }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Parent Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || 'Parent'}! Track your child's progress.
            </p>
          </div>
        </div>
        {/* Child Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Child's Performance</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childData.overallGrade}</div>
            <p className="text-xs text-muted-foreground">
              Overall grade
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childData.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <Heart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childData.healthStatus?.overall_mood || 'Good'}</div>
            <p className="text-xs text-muted-foreground">
              Latest check-in
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Rank</CardTitle>
            <Trophy className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{childData.teamRank}</div>
            <p className="text-xs text-muted-foreground">
              On leaderboard
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Games */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Games
            </CardTitle>
            <CardDescription>
              Your child's performance
            </CardDescription>
          </CardHeader>
          <CardContent>
           <div className="space-y-3">
             {childData.games?.length > 0 ? childData.games.map((game, index) => (
               <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                 <div>
                   <p className="font-medium">vs {game.opponent}</p>
                   <p className="text-sm text-gray-600">{game.points || 0} pts, {game.rebounds || 0} reb, {game.assists || 0} ast</p>
                 </div>
                 <div className="text-right">
                   <Badge variant={game.result === 'W' ? 'default' : 'destructive'}>
                     {game.result}
                   </Badge>
                   <p className="text-xs text-gray-500 mt-1">{new Date(game.game_date).toLocaleDateString()}</p>
                 </div>
               </div>
             )) : (
               <p className="text-center text-muted-foreground py-4">No game data available</p>
             )}
           </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600">
              View All Games
            </Button>
          </CardContent>
        </Card>

        {/* Coach Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Coach Feedback
            </CardTitle>
            <CardDescription>
              Recent messages about your child
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">Excellent improvement in defense</p>
                <p className="text-xs text-green-600 mt-1">Coach Martinez • 2 days ago</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Strong leadership during last game</p>
                <p className="text-xs text-blue-600 mt-1">Coach Martinez • 1 week ago</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">Focus on free throw practice</p>
                <p className="text-xs text-orange-600 mt-1">Coach Martinez • 1 week ago</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600">
              Send Message to Coach
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Development Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Development Progress
          </CardTitle>
          <CardDescription>
            Your child's skill development over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Shooting</span>
                <span className="font-medium">B+ → A-</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '82%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Defense</span>
                <span className="font-medium">B → B+</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Teamwork</span>
                <span className="font-medium">A- → A</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '90%'}}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Upcoming Schedule
          </CardTitle>
          <CardDescription>
            Your child's events this week
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="space-y-3">
             {childData.schedule?.length > 0 ? childData.schedule.map((item, index) => (
               <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                 <div>
                   <p className="font-medium">{item.title}</p>
                   <p className="text-sm text-gray-600">{item.location || 'TBD'}</p>
                   <p className="text-xs text-gray-500">Event Type: {item.event_type || 'General'}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-medium">{new Date(item.start_time).toLocaleDateString()}</p>
                   <p className="text-xs text-gray-500">{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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

export default ParentDashboard;
