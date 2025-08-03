
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Calendar,
  FileText,
  Users
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const MedicalDashboard = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'Medical Staff',
      role: userRole || 'Medical',
      avatar: '' 
    }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Medical Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || 'Medical Staff'}! Monitor player health.
            </p>
          </div>
        </div>
        {/* Medical Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Injuries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleared Players</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              Fit to play
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fitness Tests</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Scheduled this week
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fitness</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78</div>
            <p className="text-xs text-muted-foreground">
              Team average score
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Injuries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Recent Injuries
            </CardTitle>
            <CardDescription>
              Players requiring medical attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { 
                  player: "Marcus Johnson", 
                  injury: "Ankle Sprain", 
                  status: "recovering", 
                  date: "2 days ago",
                  severity: "moderate"
                },
                { 
                  player: "Sarah Chen", 
                  injury: "Knee Strain", 
                  status: "treatment", 
                  date: "1 week ago",
                  severity: "mild"
                },
                { 
                  player: "David Rodriguez", 
                  injury: "Shoulder Pain", 
                  status: "monitoring", 
                  date: "3 days ago",
                  severity: "mild"
                }
              ].map((injury, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{injury.player}</p>
                    <p className="text-sm text-gray-600">{injury.injury}</p>
                    <p className="text-xs text-gray-500">{injury.date}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      injury.severity === 'severe' ? 'destructive' :
                      injury.severity === 'moderate' ? 'secondary' : 'outline'
                    }>
                      {injury.severity}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{injury.status}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600">
              View All Injuries
            </Button>
          </CardContent>
        </Card>

        {/* Fitness Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-600" />
              Fitness Assessments
            </CardTitle>
            <CardDescription>
              Recent player evaluations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { player: "Alex Thompson", score: 85, improvement: "+5", date: "Today" },
                { player: "Emma Wilson", score: 78, improvement: "+2", date: "Yesterday" },
                { player: "Jake Martinez", score: 92, improvement: "+8", date: "2 days ago" },
                { player: "Sofia Garcia", score: 76, improvement: "-3", date: "3 days ago" }
              ].map((assessment, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{assessment.player}</p>
                    <p className="text-sm text-gray-600">Fitness Score: {assessment.score}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      assessment.improvement.startsWith('+') ? 'default' : 'destructive'
                    }>
                      {assessment.improvement}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{assessment.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600">
              Schedule Assessment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Medical Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Medical Schedule
          </CardTitle>
          <CardDescription>
            Upcoming appointments and evaluations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { 
                time: "9:00 AM", 
                type: "Fitness Test", 
                player: "Team A (U16)", 
                location: "Medical Center",
                status: "scheduled"
              },
              { 
                time: "11:00 AM", 
                type: "Injury Follow-up", 
                player: "Marcus Johnson", 
                location: "Clinic Room 1",
                status: "confirmed"
              },
              { 
                time: "2:00 PM", 
                type: "Physical Therapy", 
                player: "Sarah Chen", 
                location: "Therapy Room",
                status: "in-progress"
              },
              { 
                time: "4:00 PM", 
                type: "Health Screening", 
                player: "New Players", 
                location: "Medical Center",
                status: "scheduled"
              }
            ].map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium">{appointment.type}</p>
                  <p className="text-sm text-gray-600">{appointment.player}</p>
                  <p className="text-xs text-gray-500">{appointment.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{appointment.time}</p>
                  <Badge variant="outline" className="text-xs">
                    {appointment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
};

export default MedicalDashboard;
