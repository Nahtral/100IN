import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerWithAttendance } from '@/hooks/useAttendanceData';

interface AttendanceSummaryProps {
  players: PlayerWithAttendance[];
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ players }) => {
  const stats = players.reduce((acc, player) => {
    acc[player.status] = (acc[player.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attendance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 flex-wrap">
          <Badge variant="default" className="bg-success/10 text-success border-success/20">
            Present: {stats.present || 0}
          </Badge>
          <Badge variant="default" className="bg-warning/10 text-warning border-warning/20">
            Late: {stats.late || 0}
          </Badge>
          <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20">
            Absent: {stats.absent || 0}
          </Badge>
          <Badge variant="default" className="bg-info/10 text-info border-info/20">
            Excused: {stats.excused || 0}
          </Badge>
          <Badge variant="outline">
            Total: {players.length}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};