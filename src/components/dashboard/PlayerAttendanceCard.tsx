import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceStats {
  totalEvents: number;
  attendedEvents: number;
  attendancePercentage: number;
  currentStreak: number;
  lastAttendedDate: string | null;
  recentAttendance: Array<{
    id: string;
    event_date: string;
    event_title: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>;
}

interface PlayerAttendanceCardProps {
  attendance: AttendanceStats | null;
  loading: boolean;
  error: string | null;
}

export const PlayerAttendanceCard: React.FC<PlayerAttendanceCardProps> = ({
  attendance,
  loading,
  error
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !attendance) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {error || 'No attendance data available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-100 text-green-800">Present</Badge>;
      case 'late':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case 'excused':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Excused</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-panthers-red" />
          Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attendance Statistics */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Rate</span>
            <span className={`text-2xl font-bold ${getAttendanceColor(attendance.attendancePercentage)}`}>
              {attendance.attendancePercentage.toFixed(1)}%
            </span>
          </div>
          
          <Progress 
            value={attendance.attendancePercentage} 
            className="w-full h-2"
          />
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{attendance.attendedEvents} of {attendance.totalEvents} events attended</span>
          </div>
        </div>

        {/* Current Streak */}
        <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Current Streak</span>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {attendance.currentStreak}
          </Badge>
        </div>

        {/* Last Attended */}
        {attendance.lastAttendedDate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last attended:</span>
            <span className="font-medium">
              {formatDate(attendance.lastAttendedDate)}
            </span>
          </div>
        )}

        {/* Recent Attendance */}
        {attendance.recentAttendance.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Events</h4>
            <div className="space-y-2">
              {attendance.recentAttendance.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{record.event_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(record.event_date)}
                    </p>
                  </div>
                  <div className="ml-2">
                    {getStatusBadge(record.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};