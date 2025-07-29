import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, TrendingUp, Clock, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  
  // Fetch club news
  const { data: news } = useQuery({
    queryKey: ['club-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_updates')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  // Fetch upcoming schedules
  const { data: upcomingSchedules } = useQuery({
    queryKey: ['upcoming-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  // Fetch player performance rankings
  const { data: playerRankings } = useQuery({
    queryKey: ['player-rankings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_performance')
        .select(`
          *,
          players!inner (
            user_id,
            profiles!inner (full_name)
          )
        `)
        .order('points', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent game results
  const { data: recentGames } = useQuery({
    queryKey: ['recent-games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_performance')
        .select('game_date, opponent')
        .lt('game_date', new Date().toISOString().split('T')[0])
        .order('game_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      
      // Group by game_date and opponent to get unique games
      const uniqueGames = data?.reduce((acc: any[], curr) => {
        const existing = acc.find(game => 
          game.game_date === curr.game_date && game.opponent === curr.opponent
        );
        if (!existing) {
          acc.push(curr);
        }
        return acc;
      }, []);
      
      return uniqueGames || [];
    }
  });

  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'User',
      role: user?.user_metadata?.role || 'User',
      avatar: '' 
    }}>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Welcome to Court Vision
          </h1>
          <p className="text-muted-foreground mt-2">
            Panthers Basketball - Your central hub for team updates and performance
          </p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
          <Trophy className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Club News */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Club News & Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {news?.map((item) => (
              <div key={item.id} className="border-l-4 border-primary pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>
                    {item.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.published_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Schedules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSchedules?.map((schedule) => (
              <div key={schedule.id} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium text-sm">{schedule.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {format(new Date(schedule.start_time), 'MMM d, h:mm a')}
                </p>
                {schedule.opponent && (
                  <p className="text-xs text-muted-foreground">vs {schedule.opponent}</p>
                )}
                <p className="text-xs text-muted-foreground">{schedule.location}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance and Games Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Player Performance Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Player Performance Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerRankings?.map((performance, index) => (
                <div key={performance.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {(performance.players as any)?.profiles?.full_name || 'Player'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        vs {performance.opponent}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{performance.points} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {performance.assists}A • {performance.rebounds}R
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Game Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recent Game Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGames?.map((game, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium">vs {game.opponent}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(game.game_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">
                    View Details
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  );
};

export default Home;