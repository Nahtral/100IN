
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
import { useDashboardData, useUpcomingSchedule } from "@/hooks/useDashboardData";

const StaffDashboard = () => {
  const { stats, loading, error } = useDashboardData();
  const { schedule } = useUpcomingSchedule();

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
            <div className="text-2xl font-bold">{Math.floor((stats?.totalPlayers || 0) * 0.1)}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{Math.floor((stats?.revenue || 0) * 0.15).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedule?.length || 0}</div>
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
              {[
                { name: "Emma Wilson", type: "New Player", status: "pending", age: "U16" },
                { name: "Jake Thompson", type: "Renewal", status: "approved", age: "U14" },
                { name: "Sofia Garcia", type: "New Player", status: "pending", age: "U18" }
              ].map((registration, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{registration.name}</p>
                    <p className="text-sm text-gray-600">{registration.type} - {registration.age}</p>
                  </div>
                  <Badge variant={registration.status === 'approved' ? 'default' : 'secondary'}>
                    {registration.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              View All Registrations
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
              <Badge variant="outline">7 New</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                <span>Callback Requests</span>
              </div>
              <Badge variant="outline">3 Pending</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <span>Forms to Review</span>
              </div>
              <Badge variant="outline">5 New</Badge>
            </div>
            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600">
              Open Messages
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
            {[
              { time: "9:00 AM", title: "Staff Meeting", type: "meeting", status: "upcoming" },
              { time: "11:30 AM", title: "Parent Consultation - Johnson Family", type: "appointment", status: "upcoming" },
              { time: "2:00 PM", title: "Team Registration Deadline", type: "deadline", status: "today" },
              { time: "4:00 PM", title: "Facility Inspection", type: "task", status: "completed" },
              { time: "6:00 PM", title: "Coach Training Session", type: "training", status: "upcoming" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100">
                <div className="text-center">
                  <p className="font-medium text-sm">{item.time}</p>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;
