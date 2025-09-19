import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Target
} from 'lucide-react';
import { useAttendanceAnalytics } from '@/hooks/useAttendanceAnalytics';

const AttendanceAnalytics = () => {
  const [timeframe, setTimeframe] = useState('30');
  const timeframeDays = parseInt(timeframe);
  
  const {
    totalEvents,
    averageAttendance,
    weeklyTrends,
    monthlyTrends,
    playerAttendance,
    teamComparison,
    loading,
    error
  } = useAttendanceAnalytics(timeframeDays);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-4"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Error loading attendance data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const attendanceColor = averageAttendance >= 90 ? 'hsl(var(--primary))' : 
                         averageAttendance >= 80 ? 'hsl(var(--secondary))' : 
                         'hsl(var(--destructive))';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Attendance Analytics</h2>
          <p className="text-muted-foreground">Track and analyze attendance patterns</p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Tracked events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: attendanceColor }}>
              {averageAttendance}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playerAttendance.length}</div>
            <p className="text-xs text-muted-foreground">
              Players with recorded attendance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {weeklyTrends.length >= 2 && weeklyTrends[weeklyTrends.length - 1].attendance > weeklyTrends[weeklyTrends.length - 2].attendance ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weeklyTrends.length >= 2 
                ? Math.abs(weeklyTrends[weeklyTrends.length - 1].attendance - weeklyTrends[weeklyTrends.length - 2].attendance)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Week over week change
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, 'Attendance']}
                  labelFormatter={(label) => `${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, 'Attendance']}
                />
                <Bar dataKey="attendance" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Player and Team Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <p className="text-sm text-muted-foreground">Players with highest attendance rates</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerAttendance.slice(0, 10).map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{player.playerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.presentCount}/{player.totalEvents} events
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={player.attendanceRate >= 90 ? "default" : player.attendanceRate >= 80 ? "secondary" : "destructive"}
                  >
                    {player.attendanceRate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {teamComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Team Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">Attendance rates by team</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamComparison.map((team, index) => (
                  <div key={team.teamId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{team.teamName}</p>
                      <p className="text-sm text-muted-foreground">
                        {team.totalPlayers} players
                      </p>
                    </div>
                    <Badge 
                      variant={team.attendanceRate >= 90 ? "default" : team.attendanceRate >= 80 ? "secondary" : "destructive"}
                    >
                      {team.attendanceRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AttendanceAnalytics;