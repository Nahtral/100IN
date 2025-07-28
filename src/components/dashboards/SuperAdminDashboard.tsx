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

const SuperAdminDashboard = () => {
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
    <div className="space-y-6">
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
              Total registered users
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
              Across all age groups
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.revenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              This quarter
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage all user roles and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Staff Members</span>
              </div>
              <Badge variant="outline">{Math.floor((stats?.totalUsers || 0) * 0.15)} Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span>Coaches</span>
              </div>
              <Badge variant="outline">{Math.floor((stats?.totalUsers || 0) * 0.1)} Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <span>Players</span>
              </div>
              <Badge variant="outline">{stats?.totalPlayers || 0} Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>Parents</span>
              </div>
              <Badge variant="outline">{Math.floor((stats?.totalUsers || 0) * 0.6)} Active</Badge>
            </div>
            <Button 
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600"
              onClick={() => navigate('/user-management')}
            >
              Manage Users
            </Button>
          </CardContent>
        </Card>

        {/* System Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              System Analytics
            </CardTitle>
            <CardDescription>
              Platform usage and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily Active Users</span>
                <span className="font-medium">{stats?.activeUsers || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>System Uptime</span>
                <span className="font-medium">99.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '99.8%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Usage</span>
                <span className="font-medium">67%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '67%'}}></div>
              </div>
            </div>
            <Button 
              className="w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-600"
              onClick={() => navigate('/analytics')}
            >
              View Detailed Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Recent System Activities
          </CardTitle>
          <CardDescription>
            Latest actions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-600">by {activity.user}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-4">No recent activities</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;