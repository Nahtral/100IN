import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Trophy, 
  Calendar, 
  User, 
  CalendarDays,
  Bell,
  ArrowRight 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const CourtVision = () => {
  const navigate = useNavigate();

  // Fetch stats data
  const { data: stats } = useQuery({
    queryKey: ['court-vision-stats'],
    queryFn: async () => {
      const [playersResult, teamsResult, eventsResult] = await Promise.all([
        supabase.from('players').select('id', { count: 'exact' }),
        supabase.from('teams').select('id', { count: 'exact' }),
        supabase.from('schedules').select('id', { count: 'exact' }).gte('start_time', new Date().toISOString())
      ]);

      return {
        activePlayers: playersResult.count || 0,
        teams: teamsResult.count || 0,
        upcomingEvents: eventsResult.count || 0
      };
    }
  });

  // Fetch next event
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

  // Fetch latest news
  const { data: latestNews } = useQuery({
    queryKey: ['latest-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_updates')
        .select('*')
        .eq('priority', 'high')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar Placeholder */}
      <div className="h-6 bg-black text-white text-xs flex items-center justify-between px-4">
        <span>11:05</span>
        <div className="flex items-center gap-1">
          <span>●●●●</span>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Top Header */}
      <header className="sticky top-6 z-50 h-[60px] bg-panthers-red flex items-center justify-center shadow-lg">
        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
          <div className="text-panthers-red font-bold text-lg">🐾</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Court Vision</h1>
          <p className="text-muted-foreground">Your Central Hub for Panthers Basketball</p>
        </div>

        {/* Stats Cards Section */}
        <div className="space-y-4">
          <Card className="bg-card shadow-lg rounded-xl border-0">
            <CardContent className="flex flex-col items-center py-6">
              <Users className="h-8 w-8 text-panthers-red mb-3" />
              <div className="text-3xl font-bold text-foreground">{stats?.activePlayers || 0}</div>
              <div className="text-muted-foreground">Active Players</div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-lg rounded-xl border-0">
            <CardContent className="flex flex-col items-center py-6">
              <Trophy className="h-8 w-8 text-panthers-red mb-3" />
              <div className="text-3xl font-bold text-foreground">{stats?.teams || 0}</div>
              <div className="text-muted-foreground">Teams</div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-lg rounded-xl border-0">
            <CardContent className="flex flex-col items-center py-6">
              <Calendar className="h-8 w-8 text-panthers-red mb-3" />
              <div className="text-3xl font-bold text-foreground">{stats?.upcomingEvents || 0}</div>
              <div className="text-muted-foreground">Upcoming Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Next Event Block */}
        {nextEvent && (
          <Card className="gradient-gold shadow-lg rounded-xl border-0 overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground/80">Next Event</div>
                <h3 className="text-xl font-bold text-foreground">
                  {nextEvent.event_type === 'away_game' ? 'Away Game' : nextEvent.event_type === 'home_game' ? 'Home Game' : nextEvent.title || 'Team Event'}
                </h3>
                <div className="text-foreground/90">
                  {new Date(nextEvent.start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
                {nextEvent.location && (
                  <div className="text-sm text-foreground/80">{nextEvent.location}</div>
                )}
                <Button 
                  onClick={() => navigate('/schedule')}
                  className="w-full mt-4 bg-panthers-red hover:bg-panthers-red/90 text-white rounded-full"
                >
                  View Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important Updates Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Important Updates</h2>
          
          {latestNews ? (
            <Card className="bg-card shadow-lg rounded-xl border-0">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{latestNews.title}</h3>
                  <Badge variant="secondary" className="ml-2 flex-shrink-0">
                    {latestNews.priority}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {latestNews.content}
                </p>
                <div className="text-xs text-muted-foreground">
                  {new Date(latestNews.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card shadow-lg rounded-xl border-0">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">Welcome to the New Season!</h3>
                  <Badge variant="secondary" className="ml-2 flex-shrink-0">
                    general
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Get ready for an exciting season with the Panthers! Check out the latest updates and schedules.
                </p>
                <div className="text-xs text-muted-foreground">
                  July 29, 2025
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="outline" 
            className="w-full rounded-full border-2"
            onClick={() => navigate('/news-manager')}
          >
            View All Updates
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/players')}
              className="w-full h-14 bg-card text-foreground border border-border rounded-full flex items-center justify-center space-x-3 hover:bg-accent shadow-lg"
              variant="ghost"
            >
              <User className="h-5 w-5 text-panthers-red" />
              <span className="font-medium">Manage Players</span>
            </Button>

            <Button 
              onClick={() => navigate('/schedule')}
              className="w-full h-14 bg-card text-foreground border border-border rounded-full flex items-center justify-center space-x-3 hover:bg-accent shadow-lg"
              variant="ghost"
            >
              <CalendarDays className="h-5 w-5 text-panthers-red" />
              <span className="font-medium">View Schedule</span>
            </Button>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default CourtVision;