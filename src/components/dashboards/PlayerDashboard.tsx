
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Calendar, 
  Target, 
  TrendingUp,
  Heart,
  Trophy,
  Clock,
  User
} from "lucide-react";

const PlayerDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Points</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5</div>
            <p className="text-xs text-muted-foreground">
              Per game this season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Played</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              This season
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fitness Score</CardTitle>
            <Heart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85</div>
            <p className="text-xs text-muted-foreground">
              Out of 100
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
              On team leaderboard
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Recent Performance
            </CardTitle>
            <CardDescription>
              Your last 5 games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { opponent: "Eagles", score: "78-65", personal: "22 pts, 8 reb", result: "W" },
                { opponent: "Hawks", score: "68-72", personal: "15 pts, 6 reb", result: "L" },
                { opponent: "Lions", score: "82-59", personal: "28 pts, 10 reb", result: "W" },
                { opponent: "Bears", score: "71-68", personal: "19 pts, 7 reb", result: "W" },
                { opponent: "Wolves", score: "65-75", personal: "12 pts, 5 reb", result: "L" }
              ].map((game, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">vs {game.opponent}</p>
                    <p className="text-sm text-gray-600">{game.personal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{game.score}</p>
                    <Badge variant={game.result === 'W' ? 'default' : 'destructive'}>
                      {game.result}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Development Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Development Goals
            </CardTitle>
            <CardDescription>
              Areas for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Free Throw %</span>
                  <span className="font-medium">72% → 85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '72%'}}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Defense Rating</span>
                  <span className="font-medium">B → A</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Assist Average</span>
                  <span className="font-medium">4.2 → 6.0</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '70%'}}></div>
                </div>
              </div>
            </div>
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
            Your next events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Tomorrow", time: "4:00 PM", event: "Team Practice", location: "Court A" },
              { date: "Wednesday", time: "6:00 PM", event: "vs Eagles", location: "Home Court" },
              { date: "Friday", time: "5:00 PM", event: "Skills Training", location: "Gym" },
              { date: "Saturday", time: "10:00 AM", event: "Fitness Test", location: "Training Center" }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium">{item.event}</p>
                  <p className="text-sm text-gray-600">{item.location}</p>
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

export default PlayerDashboard;
