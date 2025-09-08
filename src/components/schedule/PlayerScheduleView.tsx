import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { format, isToday, isFuture } from 'date-fns';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface ScheduleEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  opponent?: string;
  description?: string;
  team_ids?: string[];
  status?: string | null;
  image_url?: string | null;
}

interface PlayerScheduleViewProps {
  events: ScheduleEvent[];
  loading: boolean;
}

export const PlayerScheduleView: React.FC<PlayerScheduleViewProps> = ({
  events,
  loading
}) => {
  const { primaryRole, isSuperAdmin } = useOptimizedAuth();
  
  const isPlayerRole = primaryRole === 'player' && !isSuperAdmin();

  const getEventTypeColor = (type: string) => {
    const colors = {
      game: 'bg-red-100 text-red-800',
      practice: 'bg-blue-100 text-blue-800',
      training: 'bg-green-100 text-green-800',
      meeting: 'bg-yellow-100 text-yellow-800',
      scrimmage: 'bg-purple-100 text-purple-800',
      tournament: 'bg-orange-100 text-orange-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
          <p className="text-muted-foreground">
            {isPlayerRole 
              ? "No events scheduled for your team" 
              : "No events found"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card 
          key={event.id} 
          className="hover:shadow-md transition-shadow"
        >
          {event.image_url && (
            <div className="w-full h-32 overflow-hidden rounded-t-lg">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <Badge className={getEventTypeColor(event.event_type)}>
                      {event.event_type}
                    </Badge>
                    {isToday(new Date(event.start_time)) && (
                      <Badge variant="secondary">Today</Badge>
                    )}
                  </div>
                  
                  {event.opponent && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      vs {event.opponent}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(event.start_time), 'PPP')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.start_time), 'p')} - {format(new Date(event.end_time), 'p')}
                    </div>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};