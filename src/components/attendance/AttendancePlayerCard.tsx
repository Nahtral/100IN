import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, UserX, FileText } from 'lucide-react';
import { PlayerWithAttendance } from '@/hooks/useAttendanceData';

interface AttendancePlayerCardProps {
  player: PlayerWithAttendance;
  isSelected: boolean;
  onToggleSelection: (playerId: string) => void;
  onStatusChange: (playerId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
  onNotesChange: (playerId: string, notes: string) => void;
}

export const AttendancePlayerCard: React.FC<AttendancePlayerCardProps> = ({
  player,
  isSelected,
  onToggleSelection,
  onStatusChange,
  onNotesChange
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4 text-success" />;
      case 'late': return <Clock className="h-4 w-4 text-warning" />;
      case 'absent': return <UserX className="h-4 w-4 text-destructive" />;
      case 'excused': return <FileText className="h-4 w-4 text-info" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-success/10 text-success border-success/20';
      case 'late': return 'bg-warning/10 text-warning border-warning/20';
      case 'absent': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'excused': return 'bg-info/10 text-info border-info/20';
      default: return '';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(player.id)}
            />
            
            <div className="flex items-center gap-2">
              {getStatusIcon(player.status)}
              <Badge variant="outline" className={getStatusColor(player.status)}>
                {player.status}
              </Badge>
              {player.hasExistingRecord && (
                <Badge variant="secondary" className="text-xs">
                  Previously recorded
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1">
                <h3 className="font-medium truncate">{player.full_name}</h3>
                <div className="text-sm text-muted-foreground">
                  <span>{player.team_name}</span>
                  {player.jersey_number && (
                    <span className="ml-2">#{player.jersey_number}</span>
                  )}
                  {player.position && (
                    <span className="ml-2">• {player.position}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Select
                  value={player.status}
                  onValueChange={(value: any) => onStatusChange(player.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <Textarea
                placeholder="Notes (optional)"
                value={player.notes || ''}
                onChange={(e) => onNotesChange(player.id, e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};