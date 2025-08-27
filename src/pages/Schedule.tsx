import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Clock, MapPin, Users, Eye, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ScheduleForm from '@/components/forms/ScheduleForm';
import AttendanceModal from '@/components/attendance/AttendanceModal';
import EventDetailsModal from '@/components/schedule/EventDetailsModal';
import ScheduleFilters from '@/components/schedule/ScheduleFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isFuture } from 'date-fns';

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
}

const Schedule = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [filters, setFilters] = useState<any>({});
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean;
    eventId: string;
    eventTitle: string;
    teamIds: string[];
  }>({
    isOpen: false,
    eventId: '',
    eventTitle: '',
    teamIds: []
  });
  const [eventDetailsModal, setEventDetailsModal] = useState<{
    isOpen: boolean;
    eventId: string;
  }>({
    isOpen: false,
    eventId: ''
  });

  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { userRole, isSuperAdmin } = useUserRole();
  const { toast } = useToast();

  // Fetch user's team assignments
  useEffect(() => {
    if (user?.id) {
      fetchUserTeams();
    }
  }, [user?.id]);

  // Fetch events when filters, tab, or user teams change
  useEffect(() => {
    fetchEvents();
  }, [filters, activeTab, userTeamIds]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('schedule_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'schedules' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserTeams = async () => {
    try {
      if (isSuperAdmin || userRole === 'staff') {
        // Super admins and staff see all teams
        const { data, error } = await supabase
          .from('teams')
          .select('id');
        
        if (error) throw error;
        setUserTeamIds(data?.map(t => t.id) || []);
      } else {
        // Regular users see only their assigned teams
        const { data, error } = await supabase
          .from('players')
          .select('team_id')
          .eq('user_id', user?.id)
          .eq('is_active', true);
        
        if (error) throw error;
        setUserTeamIds(data?.map(p => p.team_id).filter(Boolean) || []);
      }
    } catch (error) {
      console.error('Error fetching user teams:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('schedules')
        .select('*')
        .order('start_time', { ascending: activeTab === 'upcoming' });

      // Apply team filtering by default
      if (userTeamIds.length > 0 && !isSuperAdmin && userRole !== 'staff') {
        query = query.overlaps('team_ids', userTeamIds);
      }

      // Apply date filtering based on tab
      const now = new Date().toISOString();
      if (activeTab === 'upcoming') {
        query = query.gte('start_time', now);
      } else {
        query = query.lt('start_time', now);
      }

      // Apply additional filters
      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      
      if (filters.team_ids && filters.team_ids.length > 0) {
        query = query.overlaps('team_ids', filters.team_ids);
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,opponent.ilike.%${filters.search}%`);
      }
      
      if (filters.date_range) {
        query = query
          .gte('start_time', filters.date_range.start)
          .lte('start_time', filters.date_range.end);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const eventData = {
        title: formData.title,
        event_type: formData.eventType,
        start_time: `${formData.startDate}T${formData.startTime}:00`,
        end_time: `${formData.endDate}T${formData.endTime}:00`,
        location: formData.location,
        opponent: formData.opponent || null,
        description: formData.description || null,
        team_ids: formData.teamIds || [],
        is_recurring: Boolean(formData.isRecurring),
        recurrence_pattern: formData.isRecurring ? formData.recurrencePattern : null,
        recurrence_end_date: formData.isRecurring ? formData.recurrenceEndDate : null,
        recurrence_days_of_week: formData.isRecurring ? formData.recurrenceDaysOfWeek : null,
        created_by: user?.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('schedules')
          .update(eventData)
          .eq('id', editingEvent.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([eventData]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Event created successfully",
        });
      }

      setIsFormOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    }
  };

  const openAttendanceModal = (event: ScheduleEvent) => {
    console.log('Opening attendance modal for event:', event);
    if (!event || !event.id) {
      console.error('Cannot open attendance modal - event is null or missing id');
      toast({
        title: "Error",
        description: "Cannot open attendance - event not found",
        variant: "destructive",
      });
      return;
    }
    setAttendanceModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
      teamIds: event.team_ids || []
    });
  };

  const openEventDetailsModal = (event: ScheduleEvent) => {
    console.log('Opening event details modal for event:', event);
    setEventDetailsModal({
      isOpen: true,
      eventId: event.id
    });
  };

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

  const canManageEvents = isSuperAdmin || userRole === 'staff';
  const canManageAttendance = isSuperAdmin || userRole === 'staff' || userRole === 'coach';

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Schedule</h1>
            <p className="text-muted-foreground">Manage games and training sessions</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchEvents}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canManageEvents && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <ScheduleFilters
          onFiltersChange={setFilters}
          onClear={() => setFilters({})}
        />

        {/* Events Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No events found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'upcoming' 
                      ? "No upcoming events scheduled" 
                      : "No past events found"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEventDetailsModal(event)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            <Badge className={getEventTypeColor(event.event_type)}>
                              {event.event_type}
                            </Badge>
                            {event.is_recurring && (
                              <Badge variant="outline">Recurring</Badge>
                            )}
                            {isToday(new Date(event.start_time)) && (
                              <Badge variant="default">Today</Badge>
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

                          {event.opponent && (
                            <p className="text-sm">
                              <strong>vs {event.opponent}</strong>
                            </p>
                          )}

                          {event.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {canManageAttendance && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAttendanceModal(event);
                              }}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Attendance
                            </Button>
                          )}
                          {canManageEvents && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(event);
                                setIsFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Event Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingEvent(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </DialogTitle>
            </DialogHeader>
            <ScheduleForm
              onSubmit={handleFormSubmit}
              initialData={editingEvent ? {
                title: editingEvent.title,
                eventType: editingEvent.event_type,
                startDate: editingEvent.start_time.split('T')[0],
                startTime: editingEvent.start_time.split('T')[1]?.substring(0, 5),
                endDate: editingEvent.end_time.split('T')[0],
                endTime: editingEvent.end_time.split('T')[1]?.substring(0, 5),
                location: editingEvent.location,
                opponent: editingEvent.opponent,
                description: editingEvent.description,
                teamIds: editingEvent.team_ids || [],
                isRecurring: editingEvent.is_recurring || false,
                recurrencePattern: editingEvent.recurrence_pattern as 'daily' | 'weekly' | 'monthly',
              } : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Event Details Modal */}
        <EventDetailsModal
          isOpen={eventDetailsModal.isOpen}
          onClose={() => setEventDetailsModal(prev => ({ ...prev, isOpen: false }))}
          eventId={eventDetailsModal.eventId}
          onEventUpdated={fetchEvents}
          onEditEvent={(event) => {
            setEditingEvent(event);
            setIsFormOpen(true);
            setEventDetailsModal(prev => ({ ...prev, isOpen: false }));
          }}
          onOpenAttendance={(event) => {
            openAttendanceModal(event);
            setEventDetailsModal(prev => ({ ...prev, isOpen: false }));
          }}
        />

        {/* Attendance Modal */}
        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={() => setAttendanceModal(prev => ({ ...prev, isOpen: false }))}
          eventId={attendanceModal.eventId}
          eventTitle={attendanceModal.eventTitle}
          teamIds={attendanceModal.teamIds}
        />
      </div>
    </Layout>
  );
};

export default Schedule;