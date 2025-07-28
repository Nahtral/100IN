
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Trophy, 
  Activity,
  Zap,
  Award,
  Clock
} from "lucide-react";

const PlayerDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Per Game</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5</div>
            <p className="text-xs text-muted-foreground">
              +2.3 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Field Goal %</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">
              Above team average
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Played</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fitness Score</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85</div>
            <p className="text-xs text-muted-foreground">
              Excellent level
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance Analytics
            </CardTitle>
            <CardDescription>
              Your improvement over time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Shooting Accuracy</span>
                <span className="text-lg font-bold text-green-600">78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Defense Rating</span>
                <span className="text-lg font-bold text-blue-600">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '92%'}}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Team Play</span>
                <span className="text-lg font-bold text-purple-600">85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600">
              View Detailed Stats
            </Button>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Recent Achievements
            </CardTitle>
            <CardDescription>
              Milestones and awards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: "Player of the Month", date: "March 2024", type: "award" },
              { title: "25+ Point Game", date: "Last week", type: "milestone" },
              { title: "Perfect Attendance", date: "This month", type: "achievement" },
              { title: "Team Captain", date: "Season 2024", type: "role" }
            ].map((achievement, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-yellow-100 bg-yellow-50">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{achievement.title}</p>
                  <p className="text-sm text-gray-600">{achievement.date}</p>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                  {achievement.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Training Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            My Schedule
          </CardTitle>
          <CardDescription>
            Upcoming practices and games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { 
                date: "Today", 
                time: "6:00 PM", 
                event: "Team Practice", 
                location: "Court A", 
                type: "practice",
                mandatory: true
              },
              { 
                date: "Tomorrow", 
                time: "7:30 PM", 
                event: "vs Lakers Jr", 
                location: "Away", 
                type: "game",
                mandatory: true
              },
              { 
                date: "Thursday", 
                time: "5:00 PM", 
                event: "Individual Training", 
                location: "Gym", 
                type: "training",
                mandatory: false
              },
              { 
                date: "Saturday", 
                time: "9:00 AM", 
                event: "Team Meeting", 
                location: "Clubhouse", 
                type: "meeting",
                mandatory: true
              }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100">
                <div className="text-center min-w-[70px]">
                  <p className="text-sm font-medium text-gray-600">{item.date}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.event}</p>
                    {item.mandatory && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{item.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${
                      item.type === 'game' ? 'text-green-600 border-green-200' :
                      item.type === 'practice' ? 'text-blue-600 border-blue-200' :
                      item.type === 'training' ? 'text-orange-600 border-orange-200' :
                      'text-purple-600 border-purple-200'
                    }`}
                  >
                    {item.type}
                  </Badge>
                  {item.type === 'game' && <Trophy className="h-4 w-4 text-yellow-500" />}
                  {item.type === 'practice' && <Activity className="h-4 w-4 text-blue-500" />}
                  {item.type === 'training' && <Zap className="h-4 w-4 text-orange-500" />}
                  {item.type === 'meeting' && <Clock className="h-4 w-4 text-purple-500" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerDashboard;
