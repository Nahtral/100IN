import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Target, TrendingUp, Play, Square } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShotSession } from '@/hooks/useShotSessions';

interface ShotSessionsListProps {
  sessions: ShotSession[];
  currentSession: ShotSession | null;
  loading: boolean;
  error: string | null;
  onStartSession: () => void;
  onEndSession: (sessionId: string) => void;
  onViewSession: (session: ShotSession) => void;
}

export const ShotSessionsList: React.FC<ShotSessionsListProps> = ({
  sessions,
  currentSession,
  loading,
  error,
  onStartSession,
  onEndSession,
  onViewSession
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shot Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shot Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceBadge = (percentage: number, shots: number) => {
    if (shots < 5) return { label: 'Few Shots', variant: 'outline' as const, color: '' };
    if (percentage >= 70) return { label: 'Excellent', variant: 'default' as const, color: 'bg-green-100 text-green-800' };
    if (percentage >= 50) return { label: 'Good', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 30) return { label: 'Average', variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Work', variant: 'destructive' as const, color: '' };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-panther-blue" />
            Shot Sessions
          </div>
          {currentSession ? (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onEndSession(currentSession.id)}
              className="flex items-center gap-1"
            >
              <Square className="h-3 w-3" />
              End Session
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={onStartSession}
              className="flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Start Session
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Session */}
        {currentSession && (
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary">
                  Active Session
                </Badge>
                <span className="text-sm font-medium">
                  {formatDate(currentSession.session_date)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  {currentSession.made_shots}/{currentSession.total_shots}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentSession.total_shots > 0 
                    ? `${currentSession.shooting_percentage.toFixed(1)}%` 
                    : 'No shots yet'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No shooting sessions yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start your first session to track your progress
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Sessions</h4>
            {sessions.slice(0, 10).map((session) => {
              const badge = getPerformanceBadge(session.shooting_percentage, session.total_shots);
              const isActive = currentSession?.id === session.id;
              
              return (
                <div 
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/5 transition-colors ${
                    isActive ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => onViewSession(session)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">
                        {formatDate(session.session_date)}
                      </span>
                      <Badge 
                        variant={badge.variant} 
                        className={badge.color}
                      >
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{session.made_shots}/{session.total_shots} shots</span>
                      <span>{session.shooting_percentage.toFixed(1)}%</span>
                      {session.avg_arc > 0 && (
                        <span>{session.avg_arc.toFixed(1)}° arc</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-primary">
                      {session.shooting_percentage.toFixed(0)}%
                    </div>
                    {session.total_shots >= 10 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Quality Session</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};