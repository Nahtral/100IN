
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Trophy, 
  Activity, 
  Target,
  TrendingUp,
  Clock,
  Zap
} from "lucide-react";

const CoachDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              U16 Team
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wins</CardTitle>
            <Trophy className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78.4</div>
            <p className="text-xs text-muted-foreground">
              Points per game
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Game</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Days away
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Team Performance
            </CardTitle>
            <CardDescription>
              Current season statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Win Rate</span>
                <span className="text-lg font-bold text-green-600">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Team Chemistry</span>
                <span className="text-lg font-bold text-blue-600">88%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '88%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Fitness Level</span>
                <span className="text-lg font-bold text-orange-600">82%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{width: '82%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Player Highlights
            </CardTitle>
            <CardDescription>
              Top performers this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Marcus Johnson", metric: "28.5 PPG", improvement: "+12%", position: "PG" },
              { name: "Ashley Chen", metric: "11.2 RPG", improvement: "+8%", position: "C" },
              { name: "David Rodriguez", metric: "7.8 APG", improvement: "+15%", position: "SG" }
            ].map((player, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-gray-600">{player.position} - {player.metric}</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {player.improvement}
                </Badge>
              </div>
            ))}
            <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600">
              View All Players
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Upcoming Schedule
          </CardTitle>
          <CardDescription>
            Practices and games this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { 
                date: "Tomorrow", 
                time: "4:00 PM", 
                event: "Practice Session", 
                location: "Court A", 
                type: "practice",
                focus: "Defensive drills"
              },
              { 
                date: "Wednesday", 
                time: "6:00 PM", 
                event: "vs Eagles Basketball", 
                location: "Home Court", 
                type: "game",
                focus: "League Championship"
              },
              { 
                date: "Friday", 
                time: "4:30 PM", 
                event: "Team Fitness", 
                location: "Gym", 
                type: "training",
                focus: "Conditioning"
              },
              { 
                date: "Saturday", 
                time: "10:00 AM", 
                event: "Strategy Session", 
                location: "Meeting Room", 
                type: "meeting",
                focus: "Game analysis"
              }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-orange-200 transition-colors">
                <div className="text-center min-w-[80px]">
                  <p className="text-sm font-medium text-gray-600">{item.date}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.event}</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        item.type === 'game' ? 'text-green-600 border-green-200' :
                        item.type === 'practice' ? 'text-blue-600 border-blue-200' :
                        item.type === 'training' ? 'text-orange-600 border-orange-200' :
                        'text-purple-600 border-purple-200'
                      }`}
                    >
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{item.location} • {item.focus}</p>
                </div>
                {item.type === 'game' && <Trophy className="h-5 w-5 text-yellow-500" />}
                {item.type === 'practice' && <Activity className="h-5 w-5 text-blue-500" />}
                {item.type === 'training' && <Zap className="h-5 w-5 text-orange-500" />}
                {item.type === 'meeting' && <Clock className="h-5 w-5 text-purple-500" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachDashboard;
