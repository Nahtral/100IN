import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MapPin, Users, Edit, Copy, Archive, Trash2, Eye, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onEventUpdated: () => void;
  onEditEvent: (event: any) => void;
  onOpenAttendance: (event: any) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onEventUpdated,
  onEditEvent,
  onOpenAttendance
}) => {
  const [event, setEvent] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails();
    }
  }, [isOpen, eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      console.log('Fetching event details for eventId:', eventId);
      
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', eventId)
        .single();

      console.log('Event data response:', eventData, 'Error:', eventError);
      
      if (eventError) throw eventError;

      // Fetch teams for this event
      if (eventData.team_ids && eventData.team_ids.length > 0) {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, age_group, season')
          .in('id', eventData.team_ids);

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);
      }

      // Fetch attendance statistics
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('team_attendance')
        .select('*')
        .eq('schedule_id', eventId);

      if (!attendanceError && attendanceData) {
        const totalStats = attendanceData.reduce((acc, curr) => ({
          total_players: acc.total_players + curr.total_players,
          present_count: acc.present_count + curr.present_count,
          absent_count: acc.absent_count + curr.absent_count,
          late_count: acc.late_count + curr.late_count,
          excused_count: acc.excused_count + curr.excused_count,
        }), { total_players: 0, present_count: 0, absent_count: 0, late_count: 0, excused_count: 0 });

        setAttendanceStats(totalStats);
      }

      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateEvent = async () => {
    try {
      const duplicatedEvent = {
        ...event,
        id: undefined,
        title: `${event.title} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
      };

      const { error } = await supabase
        .from('schedules')
        .insert([duplicatedEvent]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event duplicated successfully",
      });

      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('Error duplicating event:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate event",
        variant: "destructive",
      });
    }
  };

  const handleArchiveEvent = async () => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ 
          title: `[ARCHIVED] ${event.title}`,
          description: `${event.description || ''}\n\n[Archived on ${format(new Date(), 'MMM d, yyyy')}]`
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event archived successfully",
      });

      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('Error archiving event:', error);
      toast({
        title: "Error",
        description: "Failed to archive event",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async () => {
    try {
      // Delete related attendance records first
      await supabase
        .from('player_attendance')
        .delete()
        .eq('schedule_id', eventId);

      await supabase
        .from('team_attendance')
        .delete()
        .eq('schedule_id', eventId);

      // Delete the event
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      onEventUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event?.title || 'Event Details'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">Loading event details...</div>
        ) : !event ? (
          <div className="p-8 text-center">Event not found</div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Event Details</TabsTrigger>
              <TabsTrigger value="teams">Teams & Participants</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Event Type</h4>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold">Status</h4>
                      <Badge variant={event.start_time > new Date().toISOString() ? "default" : "secondary"}>
                        {event.start_time > new Date().toISOString() ? "Upcoming" : "Past"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Start Time</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.start_time), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <p className="font-medium">End Time</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.end_time), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    </div>
                  </div>

                  {event.opponent && (
                    <div>
                      <h4 className="font-semibold">Opponent</h4>
                      <p className="text-sm text-muted-foreground">{event.opponent}</p>
                    </div>
                  )}

                  {event.description && (
                    <div>
                      <h4 className="font-semibold">Description</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  )}

                  {event.is_recurring && (
                    <div>
                      <h4 className="font-semibold">Recurring Event</h4>
                      <Badge variant="outline">
                        {event.recurrence_pattern} - {event.recurrence_pattern}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participating Teams ({teams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teams.map((team) => (
                        <Card key={team.id} className="p-4">
                          <h4 className="font-semibold">{team.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {team.season && `${team.season} • `}
                            {team.age_group && `${team.age_group}`}
                          </p>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No teams assigned to this event</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Attendance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{attendanceStats.present_count}</p>
                        <p className="text-sm text-muted-foreground">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late_count}</p>
                        <p className="text-sm text-muted-foreground">Late</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{attendanceStats.absent_count}</p>
                        <p className="text-sm text-muted-foreground">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{attendanceStats.excused_count}</p>
                        <p className="text-sm text-muted-foreground">Excused</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{attendanceStats.total_players}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No attendance data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenAttendance(event)}
            className="flex items-center gap-2"
            disabled={!event}
          >
            <UserCheck className="h-4 w-4" />
            Take Attendance
          </Button>

          {isSuperAdmin && event && (
            <>
              <Button
                variant="outline"
                onClick={() => onEditEvent(event)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Event
              </Button>

              <Button
                variant="outline"
                onClick={handleDuplicateEvent}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>

              <Button
                variant="outline"
                onClick={handleArchiveEvent}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone and will also delete all associated attendance records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">
                      Delete Event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <Button variant="outline" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;