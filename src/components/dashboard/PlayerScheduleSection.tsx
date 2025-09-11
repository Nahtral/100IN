import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location?: string;
  opponent?: string;
  description?: string;
  status: string;
}

interface PlayerScheduleSectionProps {
  events: ScheduleEvent[];
  loading: boolean;
  error: string | null;
}

export const PlayerScheduleSection: React.FC<PlayerScheduleSectionProps> = ({
  events,
  loading,
  error
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-deep-teal" />
            Upcoming Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
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
            <Calendar className="h-5 w-5 text-deep-teal" />
            Upcoming Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Unable to load schedule: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-deep-teal" />
            Upcoming Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No upcoming events
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Your schedule will appear here when events are added
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    let dateLabel;
    if (isToday) {
      dateLabel = 'Today';
    } else if (isTomorrow) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    const timeLabel = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return { dateLabel, timeLabel };
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'game': return 'bg-panthers-red text-white';
      case 'practice': return 'bg-panther-blue text-white';
      case 'training': return 'bg-deep-teal text-white';
      case 'meeting': return 'bg-panther-gold text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'game': return Users;
      case 'practice': return Users;
      case 'training': return Users;
      default: return Calendar;
    }
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-deep-teal" />
          Upcoming Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => {
            const { dateLabel, timeLabel } = formatDateTime(event.start_time);
            const EventIcon = getEventIcon(event.event_type);
            
            return (
              <div 
                key={event.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                    <EventIcon className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{event.title}</h4>
                    {event.opponent && (
                      <Badge variant="outline" className="text-xs">
                        vs {event.opponent}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{timeLabel}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {dateLabel}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-1 ${getEventTypeColor(event.event_type)}`}
                  >
                    {event.event_type}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};