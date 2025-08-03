
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  TrendingUp, 
  Calendar, 
  Users,
  DollarSign,
  Award,
  Target,
  MessageSquare,
  Trophy
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const PartnerDashboard = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  return (
    <Layout currentUser={{ 
      name: user?.user_metadata?.full_name || 'Partner',
      role: userRole || 'Partner',
      avatar: '' 
    }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54, -2px -2px 0px #B38F54, 2px -2px 0px #B38F54, -2px 2px 0px #B38F54' }}>
              Partner Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || 'Partner'}! Monitor your partnership.
            </p>
          </div>
        </div>
        {/* Partnership Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Under sponsorship
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$85K</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brand Exposure</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4M</div>
            <p className="text-xs text-muted-foreground">
              Impressions
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2x</div>
            <p className="text-xs text-muted-foreground">
              Return on investment
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sponsored Teams Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Sponsored Teams Performance
            </CardTitle>
            <CardDescription>
              How your teams are performing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { team: "Eagles U18", record: "12-3", ranking: "#2 League", performance: "Excellent" },
                { team: "Hawks U16", record: "9-6", ranking: "#5 League", performance: "Good" },
                { team: "Lions U14", record: "11-4", ranking: "#3 League", performance: "Excellent" },
                { team: "Bears U12", record: "8-7", ranking: "#7 League", performance: "Average" }
              ].map((team, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{team.team}</p>
                    <p className="text-sm text-gray-600">{team.record} • {team.ranking}</p>
                  </div>
                  <Badge variant={
                    team.performance === 'Excellent' ? 'default' :
                    team.performance === 'Good' ? 'secondary' : 'outline'
                  }>
                    {team.performance}
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-yellow-600">
              View Detailed Reports
            </Button>
          </CardContent>
        </Card>

        {/* Marketing Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Marketing Impact
            </CardTitle>
            <CardDescription>
              Brand visibility and engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Game Attendance</span>
                  <span className="font-medium">+15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Social Media Reach</span>
                  <span className="font-medium">+32%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Brand Recognition</span>
                  <span className="font-medium">+28%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '72%'}}></div>
                </div>
              </div>
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600">
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Upcoming Sponsored Events
          </CardTitle>
          <CardDescription>
            Events where your brand will be featured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { 
                date: "Tomorrow", 
                time: "6:00 PM", 
                event: "Eagles vs Hawks Championship", 
                location: "Main Arena",
                exposure: "High",
                attendance: "2,500+"
              },
              { 
                date: "Friday", 
                time: "7:00 PM", 
                event: "Lions Tournament Finals", 
                location: "Sports Complex",
                exposure: "Medium",
                attendance: "1,200+"
              },
              { 
                date: "Saturday", 
                time: "10:00 AM", 
                event: "Youth Skills Showcase", 
                location: "Community Center",
                exposure: "Medium",
                attendance: "800+"
              },
              { 
                date: "Sunday", 
                time: "2:00 PM", 
                event: "Bears Season Opener", 
                location: "Home Court",
                exposure: "Low",
                attendance: "500+"
              }
            ].map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium">{event.event}</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                  <p className="text-xs text-gray-500">Expected: {event.attendance}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{event.date}</p>
                  <p className="text-xs text-gray-500">{event.time}</p>
                  <Badge variant={
                    event.exposure === 'High' ? 'default' :
                    event.exposure === 'Medium' ? 'secondary' : 'outline'
                  }>
                    {event.exposure} Impact
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Communication Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Communication Center
          </CardTitle>
          <CardDescription>
            Direct communication with teams and management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
              Message Team Managers
            </Button>
            <Button className="bg-gradient-to-r from-green-500 to-green-600">
              Schedule Partnership Review
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-purple-600">
              Request Performance Report
            </Button>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600">
              Discuss Renewal Terms
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
};

export default PartnerDashboard;
