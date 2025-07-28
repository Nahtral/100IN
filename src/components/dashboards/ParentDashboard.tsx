
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Calendar, 
  Trophy, 
  Activity,
  TrendingUp,
  MessageCircle,
  Clock,
  Star
} from "lucide-react";

const ParentDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Child Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Child's Performance</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">A-</div>
            <p className="text-xs text-muted-foreground">
              Overall grade
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95%</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <Heart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Good</div>
            <p className="text-xs text-muted-foreground">
              No injuries
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Rank</CardTitle>
            <Trophy className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#3</div>
            <p className="text-xs text-muted-foreground">
              On leaderboard
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Games */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Games
            </CardTitle>
            <CardDescription>
              Your child's performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { opponent: "Eagles", score: "78-65", personal: "22 pts, 8 reb", result: "W", rating: "Excellent" },
                { opponent: "Hawks", score: "68-72", personal: "15 pts, 6 reb", result: "L", rating: "Good" },
                { opponent: "Lions", score: "82-59", personal: "28 pts, 10 reb", result: "W", rating: "Outstanding" }
              ].map((game, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">vs {game.opponent}</p>
                    <p className="text-sm text-gray-600">{game.personal}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={game.result === 'W' ? 'default' : 'destructive'}>
                      {game.result}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{game.rating}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600">
              View All Games
            </Button>
          </CardContent>
        </Card>

        {/* Coach Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Coach Feedback
            </CardTitle>
            <CardDescription>
              Recent messages about your child
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">Excellent improvement in defense</p>
                <p className="text-xs text-green-600 mt-1">Coach Martinez • 2 days ago</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Strong leadership during last game</p>
                <p className="text-xs text-blue-600 mt-1">Coach Martinez • 1 week ago</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">Focus on free throw practice</p>
                <p className="text-xs text-orange-600 mt-1">Coach Martinez • 1 week ago</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600">
              Send Message to Coach
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Development Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Development Progress
          </CardTitle>
          <CardDescription>
            Your child's skill development over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Shooting</span>
                <span className="font-medium">B+ → A-</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '82%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Defense</span>
                <span className="font-medium">B → B+</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Teamwork</span>
                <span className="font-medium">A- → A</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '90%'}}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Upcoming Schedule
          </CardTitle>
          <CardDescription>
            Your child's events this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Tomorrow", time: "4:00 PM", event: "Team Practice", location: "Court A", transport: "Required" },
              { date: "Wednesday", time: "6:00 PM", event: "vs Eagles", location: "Home Court", transport: "Not needed" },
              { date: "Friday", time: "5:00 PM", event: "Skills Training", location: "Gym", transport: "Required" }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium">{item.event}</p>
                  <p className="text-sm text-gray-600">{item.location}</p>
                  <p className="text-xs text-gray-500">Transport: {item.transport}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.date}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentDashboard;
