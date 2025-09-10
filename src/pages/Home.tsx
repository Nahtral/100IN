import React, { useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, TrendingUp, Clock, ArrowRight, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsModal } from '@/components/news/NewsModal';

const Home = () => {
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { isSuperAdmin } = useOptimizedAuth();
  const [selectedNews, setSelectedNews] = useState<any>(null);
  
  // Fetch recent news (limited for home page)
  const { data: recentNews } = useQuery({
    queryKey: ['recent-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_updates')
        .select('*')
        .eq('priority', 'high')
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    }
  });

  // Fetch next upcoming event
  const { data: nextEvent } = useQuery({
    queryKey: ['next-event'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch quick stats - team-specific for non-super admins
  const { data: quickStats } = useQuery({
    queryKey: ['quick-stats', isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) {
        // Super admin sees all data
        const [playersResult, teamsResult, upcomingResult] = await Promise.all([
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('schedules').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString())
        ]);

        return {
          totalPlayers: playersResult.count || 0,
          totalTeams: teamsResult.count || 0,
          upcomingEvents: upcomingResult.count || 0
        };
      } else {
        // Non-super admin users see only their team's data
        const { data: userPlayer } = await supabase
          .from('players')
          .select('team_id')
          .eq('user_id', user?.id)
          .eq('is_active', true)
          .single();

        const userTeamId = userPlayer?.team_id;

        if (userTeamId) {
          // User is a player, show their team's data using the player_teams junction table
          const [playersResult, upcomingResult] = await Promise.all([
            supabase.from('player_teams').select('*', { count: 'exact', head: true }).eq('team_id', userTeamId).eq('is_active', true),
            supabase.from('schedules').select('*', { count: 'exact', head: true }).contains('team_ids', [userTeamId]).gte('start_time', new Date().toISOString())
          ]);

          return {
            totalPlayers: playersResult.count || 0,
            totalTeams: 1, // User only sees their own team
            upcomingEvents: upcomingResult.count || 0
          };
        } else {
          // Check if user is a coach/staff assigned to teams
          const { data: coachAssignments } = await supabase
            .from('coach_assignments')
            .select('team_id')
            .eq('coach_id', user?.id)
            .eq('status', 'active');

          const teamIds = coachAssignments?.map(ca => ca.team_id) || [];

          if (teamIds.length > 0) {
            // User is a coach/staff, show their assigned teams' data
            const [playersResult, upcomingResult] = await Promise.all([
              supabase.from('players').select('*', { count: 'exact', head: true }).in('team_id', teamIds).eq('is_active', true),
              supabase.from('schedules').select('*', { count: 'exact', head: true }).overlaps('team_ids', teamIds).gte('start_time', new Date().toISOString())
            ]);

            return {
              totalPlayers: playersResult.count || 0,
              totalTeams: teamIds.length,
              upcomingEvents: upcomingResult.count || 0
            };
          }
        }

        // Default case - user has no team connections
        return {
          totalPlayers: 0,
          totalTeams: 0,
          upcomingEvents: 0
        };
      }
    },
    enabled: !!user
  });

  return (
    <Layout currentUser={currentUser}>
      <div className="mobile-space-y">
        {/* Mobile-optimized Welcome Header */}
        <div className="text-center mobile-section">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center mx-auto p-2 mb-4">
            <img src="/lovable-uploads/29580579-ebd7-4112-8fc0-10bb4e5d2701.png" alt="Panthers Logo" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="mobile-title text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Welcome to 100IN
            </h1>
            <p className="mobile-text text-muted-foreground max-w-2xl mx-auto">
              Your Central Hub for Panthers Basketball
            </p>
          </div>
        </div>

        {/* Mobile-first Quick Stats - Clickable for Super Admins */}
        <div className="mobile-metrics-grid">
          <Card className={`mobile-card text-center ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
            {isSuperAdmin ? (
              <Link to="/players" className="block">
                <CardContent className="mobile-card-content pt-4">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                  <div className="text-2xl sm:text-3xl font-bold">{quickStats?.totalPlayers || 0}</div>
                  <p className="mobile-text-sm text-muted-foreground">Active Players</p>
                  <p className="text-xs text-primary mt-1">Click to manage</p>
                </CardContent>
              </Link>
            ) : (
              <CardContent className="mobile-card-content pt-4">
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                <div className="text-2xl sm:text-3xl font-bold">{quickStats?.totalPlayers || 0}</div>
                <p className="mobile-text-sm text-muted-foreground">Active Players</p>
              </CardContent>
            )}
          </Card>
          
          <Card className={`mobile-card text-center ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
            {isSuperAdmin ? (
              <Link to="/teams" className="block">
                <CardContent className="mobile-card-content pt-4">
                  <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                  <div className="text-2xl sm:text-3xl font-bold">{quickStats?.totalTeams || 0}</div>
                  <p className="mobile-text-sm text-muted-foreground">Teams</p>
                  <p className="text-xs text-primary mt-1">Click to manage</p>
                </CardContent>
              </Link>
            ) : (
              <CardContent className="mobile-card-content pt-4">
                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                <div className="text-2xl sm:text-3xl font-bold">{quickStats?.totalTeams || 0}</div>
                <p className="mobile-text-sm text-muted-foreground">Teams</p>
              </CardContent>
            )}
          </Card>
          
          <Card className="mobile-card text-center cursor-pointer hover:shadow-lg transition-shadow">
            <Link to="/schedule" className="block">
              <CardContent className="mobile-card-content pt-4">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-3" />
                <div className="text-2xl sm:text-3xl font-bold">{quickStats?.upcomingEvents || 0}</div>
                <p className="mobile-text-sm text-muted-foreground">Upcoming Events</p>
                <p className="text-xs text-primary mt-1">Click to view</p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Next Event Highlight */}
        {nextEvent && (
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Calendar className="h-5 w-5" />
                Next Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">{nextEvent.title}</h3>
                  <p className="text-orange-700">
                    {format(new Date(nextEvent.start_time), 'EEEE, MMMM d \'at\' h:mm a')}
                  </p>
                  <p className="text-sm text-orange-600">{nextEvent.location}</p>
                  {nextEvent.opponent && (
                    <p className="text-sm text-orange-600">vs {nextEvent.opponent}</p>
                  )}
                </div>
                <Button asChild>
                  <Link to="/schedule">
                    View Schedule <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important News */}
        {recentNews && recentNews.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Important Updates</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentNews.map((item) => (
                <NewsCard 
                  key={item.id} 
                  news={item} 
                  onClick={() => setSelectedNews(item)}
                />
              ))}
            </div>
            
            <div className="flex justify-center">
              <Button asChild variant="outline" className="w-full max-w-sm">
                <Link to="/news">
                  View All Updates <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <NewsModal 
              news={selectedNews}
              open={!!selectedNews}
              onOpenChange={(open) => !open && setSelectedNews(null)}
            />
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mobile-card-grid">
              {isSuperAdmin && (
                <Button asChild variant="outline" className="mobile-btn h-auto flex-col space-y-2">
                  <Link to="/players">
                    <Users className="h-6 w-6" />
                    <span>Manage Players</span>
                  </Link>
                </Button>
              )}
              
              <Button asChild variant="outline" className="mobile-btn h-auto flex-col space-y-2">
                <Link to="/schedule">
                  <Calendar className="h-6 w-6" />
                  <span>View Schedule</span>
                </Link>
              </Button>
              
              {isSuperAdmin && (
                <Button asChild variant="outline" className="mobile-btn h-auto flex-col space-y-2">
                  <Link to="/analytics">
                    <Target className="h-6 w-6" />
                    <span>View Analytics</span>
                  </Link>
                </Button>
              )}
              
              <Button asChild variant="outline" className="mobile-btn h-auto flex-col space-y-2">
                <Link to="/dashboard">
                  <TrendingUp className="h-6 w-6" />
                  <span>Dashboard</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6 pb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Ready to get started?
            </h3>
            <p className="text-blue-700 mb-4">
              Explore all the features 100IN has to offer for managing your basketball team
            </p>
            <Button asChild size="lg">
              <Link to="/dashboard">
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Home;