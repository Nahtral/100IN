import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MapPin, Users, Edit, Archive, Trash2, Copy, UserPlus, Image as ImageIcon, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  created_by: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  created_at?: string;
  updated_at?: string;
  status?: string | null;
  image_url?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
}

interface Team {
  id: string;
  name: string;
  season?: string;
}

interface Player {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (eventId: string, isHardDelete?: boolean) => void;
  onAttendance: (event: ScheduleEvent) => void;
  onDuplicate: (event: ScheduleEvent) => void;
  onArchive: (eventId: string) => void;
  onUnarchive: (eventId: string) => void;
  onRefresh: () => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onAttendance,
  onDuplicate,
  onArchive,
  onUnarchive,
  onRefresh
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();

  useEffect(() => {
    if (event && event.team_ids && event.team_ids.length > 0) {
      fetchTeamsAndPlayers();
    }
  }, [event]);

  const fetchTeamsAndPlayers = async () => {
    if (!event?.team_ids) return;

    setLoading(true);
    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, season')
        .in('id', event.team_ids);

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch players for the teams
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          jersey_number,
          position,
          profiles!inner(
            full_name,
            email
          )
        `)
        .in('team_id', event.team_ids)
        .eq('is_active', true);

      if (playersError) throw playersError;
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error fetching teams and players:', error);
      toast({
        title: "Error",
        description: "Failed to load team and player data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // These functions are now handled by parent component
  // Remove the local handleArchive and handleDuplicate functions

  const getEventTypeColor = (type: string) => {
    const colors = {
      game: 'bg-red-100 text-red-800',
      practice: 'bg-blue-100 text-blue-800',
      training: 'bg-green-100 text-green-800',
      meeting: 'bg-yellow-100 text-yellow-800',
      scrimmage: 'bg-purple-100 text-purple-800',
      tournament: 'bg-orange-100 text-orange-800',
      'FNL': 'bg-red-100 text-red-800',
      'DBL': 'bg-blue-100 text-blue-800',
      'Team Building': 'bg-green-100 text-green-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Check if user can manage events (super admin, staff, or coach only)
  const canManageEvents = isSuperAdmin || hasRole('staff') || hasRole('coach');

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Image */}
          {event.image_url && (
            <Card className="overflow-hidden">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  console.error('Failed to load event image:', event.image_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </Card>
          )}

          {/* Event Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold">{event.title}</h2>
                    <Badge className={getEventTypeColor(event.event_type)}>
                      {event.event_type}
                    </Badge>
                    {event.is_recurring && (
                      <Badge variant="outline">Recurring</Badge>
                    )}
                    {event.status === 'archived' && (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.start_time), 'MMM d, yyyy h:mm a')} - 
                      {format(new Date(event.end_time), 'h:mm a')}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                    {event.team_ids && event.team_ids.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.team_ids.length} team{event.team_ids.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {canManageEvents && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(event)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDuplicate(event)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    {event.status === 'archived' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUnarchive(event.id)}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-1" />
                        Unarchive
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(event.id)}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this event? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(event.id, false)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {event.opponent && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Opponent</h4>
                  <p className="text-lg">{event.opponent}</p>
                </div>
              )}

              {event.description && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Description</h4>
                  <p className="text-muted-foreground">{event.description}</p>
                </div>
              )}

              {event.is_recurring && event.recurrence_pattern && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Recurrence</h4>
                  <p className="text-muted-foreground capitalize">{event.recurrence_pattern}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams and Players */}
          {teams.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Teams & Players ({players.length} players)
                  </CardTitle>
                  {canManageEvents && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAttendance(event)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Manage Attendance
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.map((team) => {
                    const teamPlayers = players.filter(p => 
                      event.team_ids?.includes(team.id)
                    );
                    
                    return (
                      <div key={team.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{team.name}</h4>
                            {team.season && (
                              <p className="text-sm text-muted-foreground">
                                Season: {team.season}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {teamPlayers.length} players
                          </Badge>
                        </div>
                        
                        {teamPlayers.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {teamPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                              >
                                <div>
                                  <p className="font-medium text-sm">
                                    {player.profiles?.full_name || 'Unknown Player'}
                                  </p>
                                  {player.position && (
                                    <p className="text-xs text-muted-foreground">
                                      {player.position}
                                    </p>
                                  )}
                                </div>
                                {player.jersey_number && (
                                  <Badge variant="outline" className="text-xs">
                                    #{player.jersey_number}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Created</p>
                  <p>{event.created_at ? format(new Date(event.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Last Updated</p>
                  <p>{event.updated_at ? format(new Date(event.updated_at), 'MMM d, yyyy h:mm a') : 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;