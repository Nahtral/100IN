
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  Phone, 
  Mail,
  Clock,
  CheckCircle
} from "lucide-react";
import { useStaffDashboardData } from "@/hooks/useStaffDashboardData";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { Link } from "react-router-dom";

const StaffDashboard = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const { 
    stats, 
    pendingRegistrations, 
    todaySchedule, 
    pendingTasks, 
    loading, 
    error 
  } = useStaffDashboardData();

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center p-8 text-red-600">Error: {error}</div>;
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
            Staff Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Manage registrations and team operations.
          </p>
        </div>
      </div>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Due today
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrations</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingRegistrations || 0}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
        
        {isSuperAdmin && (
          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{(stats?.revenue || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        )}
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Registration Management
            </CardTitle>
            <CardDescription>
              Handle new registrations and renewals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {pendingRegistrations.length > 0 ? (
                pendingRegistrations.slice(0, 3).map((registration, index) => (
                  <div key={registration.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{registration.full_name}</p>
                      <p className="text-sm text-gray-600">{registration.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {registration.approval_status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending registrations
                </p>
              )}
            </div>
            <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              <Link to="/user-management">
                View All Registrations
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Communication Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Communication Center
            </CardTitle>
            <CardDescription>
              Messages and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Unread Messages</span>
              </div>
              <Badge variant="outline">{stats?.unreadMessages || 0} New</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                <span>Callback Requests</span>
              </div>
              <Badge variant="outline">{stats?.callbackRequests || 0} Pending</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <span>Forms to Review</span>
              </div>
              <Badge variant="outline">{stats?.formsToReview || 0} New</Badge>
            </div>
            <Button asChild className="w-full bg-gradient-to-r from-green-500 to-green-600">
              <Link to="/chat">
                Open Messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            Events and tasks for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                  <div className="text-center">
                    <p className="font-medium text-sm">
                      {new Date(item.start_time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.event_type}
                      </Badge>
                      {item.location && (
                        <span className="text-xs text-muted-foreground">at {item.location}</span>
                      )}
                      {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events scheduled for today
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;
