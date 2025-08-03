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
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Link } from 'react-router-dom';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import PlayerDashboard from '@/components/dashboards/PlayerDashboard';
import CoachDashboard from '@/components/dashboards/CoachDashboard';
import ParentDashboard from '@/components/dashboards/ParentDashboard';
import StaffDashboard from '@/components/dashboards/StaffDashboard';
import MedicalDashboard from '@/components/dashboards/MedicalDashboard';
import PartnerDashboard from '@/components/dashboards/PartnerDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const { isSuperAdmin, userRole, loading: roleLoading } = useUserRole();
  const { isTestMode, effectiveRole, effectiveIsSuperAdmin } = useRoleSwitcher();
  const { currentUser } = useCurrentUser();
  const { stats, loading, error } = useDashboardData();

  // Use effective role and admin status based on test mode
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const actualUserRole = isTestMode ? effectiveRole : userRole;

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

  if (loading || roleLoading) {
    return (
      <Layout currentUser={currentUser}>
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

  // Render role-specific dashboard
  if (actualIsSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  // Render specific dashboard based on user role (or test role)
  switch (actualUserRole) {
    case 'player':
      return <PlayerDashboard />;
    case 'coach':
      return <CoachDashboard />;
    case 'parent':
      return <ParentDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'medical':
      return <MedicalDashboard />;
    case 'partner':
      return <PartnerDashboard />;
    default:
      // For users without specific roles, show limited dashboard with only Top Performers
      break;
  }

  // Default dashboard for users without specific roles - only shows Top Performers
  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome to your dashboard
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Target className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Top Performers - Available to all users */}
        <div className="max-w-md mx-auto">
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
      </div>
    </Layout>
  );
};

export default Dashboard;