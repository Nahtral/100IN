import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Activity, 
  Shield, 
  UserCheck, 
  Heart,
  Handshake,
  BarChart3,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { stats, loading, error } = useDashboardData();
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Fetch recent activities from database
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        // Fetch recent data without complex joins
        const [teamsData, schedulesData, newsData] = await Promise.all([
          supabase.from('teams').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('schedules').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('news_updates').select('*').order('created_at', { ascending: false }).limit(3)
        ]);

        const activities = [];

        // Add team activities
        teamsData.data?.forEach(team => {
          activities.push({
            action: `New team "${team.name}" registered`,
            user: 'Team Admin',
            time: formatTimeAgo(team.created_at),
            type: 'success'
          });
        });

        // Add schedule activities
        schedulesData.data?.forEach(schedule => {
          activities.push({
            action: `Event "${schedule.title}" scheduled`,
            user: 'Staff Member',
            time: formatTimeAgo(schedule.created_at),
            type: 'info'
          });
        });

        // Add news activities
        newsData.data?.forEach(news => {
          activities.push({
            action: `News "${news.title}" published`,
            user: 'Content Manager',
            time: formatTimeAgo(news.created_at),
            type: 'info'
          });
        });

        // Sort by most recent and take top 4
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivities(activities.slice(0, 4));
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        // Fallback to mock data if needed
        setRecentActivities([
          { action: "System started", user: "System", time: "1 hour ago", type: "info" }
        ]);
      }
    };

    fetchRecentActivities();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'User',
      role: userRole || 'Super Admin',
      avatar: '' 
    }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || 'Admin'}! Manage your organization.
            </p>
          </div>
          <div className="bg-black text-white px-4 py-2 rounded-lg">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Panel
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                All caught up
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <Trophy className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTeams || 0}</div>
              <p className="text-xs text-muted-foreground">
                Teams managed
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Players</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Players registered
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">User accessed the main dashboard</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span>Just now</span>
                      <span>User Action</span>
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Viewed dashboard</p>
                      <p className="text-sm text-muted-foreground">User accessed the main dashboard</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span>Just now</span>
                      <span>User Action</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Recent Users
              </CardTitle>
              <CardDescription>
                Newly registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-medium">N</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user?.user_metadata?.full_name || 'Nahtral'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email || 'nahtral@supernahtral.com'}</p>
                  </div>
                  <Badge variant="outline">admin</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SuperAdminDashboard;