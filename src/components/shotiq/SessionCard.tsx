import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BarChart3,
  Eye,
  Edit,
  Archive,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

interface ShotSession {
  id: string;
  player_id: string;
  super_admin_id: string;
  session_name: string;
  location?: string;
  rim_height_inches: number;
  total_shots: number;
  makes: number;
  avg_arc_degrees?: number;
  avg_depth_inches?: number;
  avg_lr_deviation_inches?: number;
  session_duration_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'completed' | 'archived';
  player_name?: string;
}

interface SessionCardProps {
  session: ShotSession;
  onView: (session: ShotSession) => void;
  onEdit: (session: ShotSession) => void;
  onArchive: (session: ShotSession) => void;
  onDelete: (session: ShotSession) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onView,
  onEdit,
  onArchive,
  onDelete
}) => {
  const { isSuperAdmin } = useUserRole();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  const shootingPercentage = session.total_shots > 0 ? 
    ((session.makes / session.total_shots) * 100).toFixed(1) : 
    '0';

  const isRecent = new Date(session.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary"
      onClick={() => onView(session)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {session.session_name}
              {isRecent && (
                <Badge variant="secondary" className="text-xs">NEW</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {session.player_name || 'Unknown Player'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(session.created_at), 'MMM d, yyyy')}
              </div>
              {session.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {session.location}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(session.status || 'active')} className="capitalize">
              {session.status || 'active'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{session.total_shots}</div>
            <div className="text-xs text-muted-foreground">Shots</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{session.makes}</div>
            <div className="text-xs text-muted-foreground">Makes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{shootingPercentage}%</div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">
              {session.session_duration_minutes || 0}m
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>

        {/* Performance Indicators */}
        {(session.avg_arc_degrees || session.avg_depth_inches) && (
          <div className="flex items-center justify-center gap-4 py-2 bg-muted rounded-md">
            {session.avg_arc_degrees && (
              <div className="text-center">
                <div className="text-sm font-medium">{session.avg_arc_degrees.toFixed(1)}°</div>
                <div className="text-xs text-muted-foreground">Arc</div>
              </div>
            )}
            {session.avg_depth_inches && (
              <div className="text-center">
                <div className="text-sm font-medium">{session.avg_depth_inches.toFixed(1)}"</div>
                <div className="text-xs text-muted-foreground">Depth</div>
              </div>
            )}
            {session.avg_lr_deviation_inches && (
              <div className="text-center">
                <div className="text-sm font-medium">{session.avg_lr_deviation_inches.toFixed(1)}"</div>
                <div className="text-xs text-muted-foreground">L/R</div>
              </div>
            )}
          </div>
        )}

        {/* Notes Preview */}
        {session.notes && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <p className="line-clamp-2">{session.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Updated {format(new Date(session.updated_at), 'MMM d, HH:mm')}
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onView(session);
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            
            {isSuperAdmin && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(session);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(session);
                  }}
                >
                  <Archive className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionCard;