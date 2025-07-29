import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  Trophy, 
  TrendingUp, 
  Activity,
  Calendar,
  AlertTriangle,
  DollarSign,
  Target,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, loading, error } = useDashboardData();

  // Fetch recent activities
  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const [newsResult, schedulesResult, performanceResult] = await Promise.all([
        supabase.from('news_updates').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('schedules').select('*').order('created_at', { ascending: false }).limit(2),
        supabase.from('player_performance').select('*').order('created_at', { ascending: false }).limit(2)
      ]);

      const activities = [
        ...(newsResult.data?.map(item => ({
          type: 'news',
          title: `News: ${item.title}`,
          time: item.created_at,
          icon: TrendingUp
        })) || []),
        ...(schedulesResult.data?.map(item => ({
          type: 'schedule',
          title: `Event: ${item.title}`,
          time: item.created_at,
          icon: Calendar
        })) || []),
        ...(performanceResult.data?.map(item => ({
          type: 'performance',
          title: `Performance vs ${item.opponent}`,
          time: item.created_at,
          icon: Trophy
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      return activities;
    }
  });

  // Fetch top performers
  const { data: topPerformers } = useQuery({
    queryKey: ['top-performers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_performance')
        .select('*')
        .order('points', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading) {
    return (
      <Layout currentUser={{ 
        name: user?.user_metadata?.full_name || 'User',
        role: user?.user_metadata?.role || 'User',
        avatar: '' 
      }}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Analytics and performance overview
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <Activity className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.activeUsers || 0} active this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTeams || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalPlayers || 0} total players
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.revenue?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                Last 3 months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Pending resolution
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Staff Members</span>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Coaches</span>
                <Badge variant="secondary">8</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Players</span>
                <Badge variant="secondary">{stats?.totalPlayers || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Parents</span>
                <Badge variant="secondary">45</Badge>
              </div>
              <Button asChild className="w-full mt-4">
                <Link to="/user-management">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          {/* System Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Daily Active Users</span>
                <span className="font-semibold">{Math.floor((stats?.activeUsers || 0) * 0.3)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">System Uptime</span>
                <Badge variant="outline" className="text-green-600">99.9%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage Usage</span>
                <span className="font-semibold">2.4 GB</span>
              </div>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/analytics">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers?.slice(0, 5).map((performance, index) => (
                  <div key={performance.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">#{index + 1}</span>
                      </div>
                      <span className="text-sm font-medium">Player {index + 1}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">{performance.points}</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/players">View All Players</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities?.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-center gap-4 py-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.time)}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {!recentActivities?.length && (
                <p className="text-center text-muted-foreground py-8">
                  No recent activities
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;