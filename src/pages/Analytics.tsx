
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Activity, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface AnalyticsData {
  totalPlayers: number;
  totalGames: number;
  averageFitness: number;
  injuredPlayers: number;
  upcomingEvents: number;
  recentPerformance: any[];
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalPlayers: 0,
    totalGames: 0,
    averageFitness: 0,
    injuredPlayers: 0,
    upcomingEvents: 0,
    recentPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin, hasRole, loading: roleLoading } = useUserRole();

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || "User",
    role: "Coach",
    avatar: user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || "U"
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFilter]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch players count
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id');
      
      if (playersError) throw playersError;

      // Fetch games count
      const { data: games, error: gamesError } = await supabase
        .from('schedules')
        .select('id')
        .eq('event_type', 'game');
      
      if (gamesError) throw gamesError;

      // Fetch health data for fitness average and injured count
      const { data: healthData, error: healthError } = await supabase
        .from('health_wellness')
        .select('fitness_score, injury_status')
        .gte('date', new Date(Date.now() - parseInt(timeFilter) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      if (healthError) throw healthError;

      // Fetch upcoming events
      const { data: upcomingEvents, error: eventsError } = await supabase
        .from('schedules')
        .select('id')
        .gte('start_time', new Date().toISOString());
      
      if (eventsError) throw eventsError;

      // Fetch recent performance data
      const { data: recentPerformance, error: performanceError } = await supabase
        .from('player_performance')
        .select(`
          *,
          players (
            profiles (
              full_name
            )
          )
        `)
        .order('game_date', { ascending: false })
        .limit(10);
      
      if (performanceError) throw performanceError;

      // Calculate analytics
      const fitnessScores = healthData?.filter(h => h.fitness_score).map(h => h.fitness_score) || [];
      const averageFitness = fitnessScores.length > 0 
        ? Math.round(fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length)
        : 0;

      const injuredCount = healthData?.filter(h => h.injury_status === 'injured').length || 0;

      setAnalyticsData({
        totalPlayers: players?.length || 0,
        totalGames: games?.length || 0,
        averageFitness,
        injuredPlayers: injuredCount,
        upcomingEvents: upcomingEvents?.length || 0,
        recentPerformance: recentPerformance || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceGrade = (points: number) => {
    if (points >= 20) return { grade: 'A', color: 'text-green-600' };
    if (points >= 15) return { grade: 'B', color: 'text-blue-600' };
    if (points >= 10) return { grade: 'C', color: 'text-yellow-600' };
    return { grade: 'D', color: 'text-red-600' };
  };

  const canAccessAnalytics = isSuperAdmin || hasRole('staff') || hasRole('coach');

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Performance metrics and insights</p>
          </div>
          {canAccessAnalytics && (
            <div className="flex items-center gap-4">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {roleLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : !canAccessAnalytics ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                Analytics data is only available to super administrators, staff, and coaches. 
                Contact your system administrator if you need access to this feature.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Players</p>
                      <p className="text-2xl font-bold">{analyticsData.totalPlayers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Games Played</p>
                      <p className="text-2xl font-bold">{analyticsData.totalGames}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Fitness</p>
                      <p className="text-2xl font-bold">{analyticsData.averageFitness}/100</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Injured</p>
                      <p className="text-2xl font-bold text-red-600">{analyticsData.injuredPlayers}</p>
                    </div>
                    <Target className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming</p>
                      <p className="text-2xl font-bold">{analyticsData.upcomingEvents}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Team Health Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Team Fitness Level</span>
                      <span>{analyticsData.averageFitness}%</span>
                    </div>
                    <Progress value={analyticsData.averageFitness} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Injury Rate</span>
                      <span>{analyticsData.totalPlayers > 0 ? Math.round((analyticsData.injuredPlayers / analyticsData.totalPlayers) * 100) : 0}%</span>
                    </div>
                    <Progress 
                      value={analyticsData.totalPlayers > 0 ? (analyticsData.injuredPlayers / analyticsData.totalPlayers) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Player Availability</span>
                      <span>{analyticsData.totalPlayers > 0 ? Math.round(((analyticsData.totalPlayers - analyticsData.injuredPlayers) / analyticsData.totalPlayers) * 100) : 0}%</span>
                    </div>
                    <Progress 
                      value={analyticsData.totalPlayers > 0 ? ((analyticsData.totalPlayers - analyticsData.injuredPlayers) / analyticsData.totalPlayers) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData.recentPerformance.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">No performance data available</p>
                  ) : (
                    <div className="space-y-3">
                      {analyticsData.recentPerformance.slice(0, 5).map((performance, index) => {
                        const { grade, color } = getPerformanceGrade(performance.points);
                        return (
                          <div key={performance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">
                                {(performance.players as any)?.profiles?.full_name || 'Unknown Player'}
                              </p>
                              <p className="text-xs text-gray-600">
                                {performance.points} pts, {performance.assists} ast, {performance.rebounds} reb
                              </p>
                            </div>
                            <Badge variant="outline" className={color}>
                              Grade {grade}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Game Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.recentPerformance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No game statistics available. Performance data will appear here once games are recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Player</th>
                          <th className="text-center py-2">Date</th>
                          <th className="text-center py-2">PTS</th>
                          <th className="text-center py-2">AST</th>
                          <th className="text-center py-2">REB</th>
                          <th className="text-center py-2">FG%</th>
                          <th className="text-center py-2">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.recentPerformance.map((performance) => {
                          const { grade, color } = getPerformanceGrade(performance.points);
                          const fgPercentage = performance.field_goals_attempted > 0 
                            ? Math.round((performance.field_goals_made / performance.field_goals_attempted) * 100)
                            : 0;
                          
                          return (
                            <tr key={performance.id} className="border-b hover:bg-gray-50">
                              <td className="py-2">
                                {(performance.players as any)?.profiles?.full_name || 'Unknown Player'}
                              </td>
                              <td className="text-center py-2">{performance.game_date}</td>
                              <td className="text-center py-2 font-semibold">{performance.points}</td>
                              <td className="text-center py-2">{performance.assists}</td>
                              <td className="text-center py-2">{performance.rebounds}</td>
                              <td className="text-center py-2">{fgPercentage}%</td>
                              <td className="text-center py-2">
                                <span className={`font-semibold ${color}`}>{grade}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
