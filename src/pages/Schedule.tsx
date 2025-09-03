import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Clock, MapPin, Users, Eye, RefreshCw, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ScheduleForm from '@/components/forms/ScheduleForm';
import AttendanceModal from '@/components/attendance/AttendanceModal';
import ScheduleFilters from '@/components/schedule/ScheduleFilters';
import EventDetailsModal from '@/components/schedule/EventDetailsModal';
import DuplicateEventModal from '@/components/schedule/DuplicateEventModal';
import EventActionMenu from '@/components/schedule/EventActionMenu';
import EventImageUpload from '@/components/schedule/EventImageUpload';
import { LazyLoadWrapper } from '@/components/ui/LazyLoadWrapper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';
import { useScheduleCache } from '@/hooks/useScheduleCache';
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
  status?: string | null;
  image_url?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
}

const Schedule = () => {
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
    event: ScheduleEvent | null;
  }>({
    isOpen: false,
    event: null
  });
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    event: ScheduleEvent | null;
  }>({
    isOpen: false,
    event: null
  });
  const [imageUploadModal, setImageUploadModal] = useState<{
    isOpen: boolean;
    event: ScheduleEvent | null;
  }>({
    isOpen: false,
    event: null
  });

  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const { userRole, isSuperAdmin } = useUserRole();
  const { toast } = useToast();

  // Use cached events with debounced filtering
  const debouncedFilters = useDebounce(filters, 300);
  const { 
    events, 
    totalCount, 
    loading, 
    error: scheduleError, 
    fetchEvents, 
    refetch 
  } = useScheduleCache();

  // Debounced refetch to prevent excessive calls
  const debouncedRefetch = useDebouncedCallback(() => refetch(), 1000);

  // Fetch user's team assignments
  useEffect(() => {
    if (user?.id) {
      fetchUserTeams();
    }
  }, [user?.id]);

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

  // Memoized filtered events for better performance
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = events.filter(event => {
      // Filter out deleted events unless super admin
      if (event.status === 'deleted' && !isSuperAdmin) {
        return false;
      }
      return true;
    });
    
    // Apply tab filtering
    const now = new Date().toISOString();
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(event => 
        event.start_time >= now && 
        (!event.status || event.status === 'active')
      );
    } else if (activeTab === 'past') {
      filtered = filtered.filter(event => 
        event.start_time < now && 
        (!event.status || event.status === 'active')
      );
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(event => event.status === 'archived');
    }
    
    return filtered;
  }, [events, activeTab, isSuperAdmin]);

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
        status: 'active',
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
      debouncedRefetch();
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
    setAttendanceModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
      teamIds: event.team_ids || []
    });
  };

  const openEventDetails = (event: ScheduleEvent) => {
    setEventDetailsModal({
      isOpen: true,
      event
    });
  };

  const handleDeleteEvent = async (eventId: string, isHardDelete = false) => {
    try {
      if (isHardDelete) {
        // Hard delete - permanently remove
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', eventId);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Event permanently deleted",
        });
      } else {
        // Soft delete - mark as deleted
        const { error } = await supabase
          .from('schedules')
          .update({ 
            status: 'deleted', 
            deleted_at: new Date().toISOString() 
          })
          .eq('id', eventId);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Event deleted successfully",
        });
      }
      
      setEventDetailsModal({ isOpen: false, event: null });
      debouncedRefetch();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const handleArchiveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ 
          status: 'archived', 
          archived_at: new Date().toISOString() 
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Event archived successfully",
      });
      
      debouncedRefetch();
    } catch (error) {
      console.error('Error archiving event:', error);
      toast({
        title: "Error",
        description: "Failed to archive event",
        variant: "destructive",
      });
    }
  };

  const handleUnarchiveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ 
          status: 'active', 
          archived_at: null 
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Event unarchived successfully",
      });
      
      debouncedRefetch();
    } catch (error) {
      console.error('Error unarchiving event:', error);
      toast({
        title: "Error",
        description: "Failed to unarchive event",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateEvent = async (eventId: string, options: { shiftDays: number; copyTeams: boolean; newTitle?: string }) => {
    try {
      const { data, error } = await supabase.rpc('rpc_duplicate_event', {
        event_id: eventId,
        shift_days: options.shiftDays,
        copy_teams: options.copyTeams,
        new_title: options.newTitle
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Event duplicated successfully",
      });
      
      setDuplicateModal({ isOpen: false, event: null });
      debouncedRefetch();
    } catch (error) {
      console.error('Error duplicating event:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate event",
        variant: "destructive",
      });
    }
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
              onClick={debouncedRefetch}
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
            {isSuperAdmin && (
              <TabsTrigger value="archived">Archived Events</TabsTrigger>
            )}
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
            ) : filteredEvents.length === 0 ? (
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
                 {filteredEvents.map((event) => (
                   <LazyLoadWrapper key={event.id}>
                   <Card 
                      key={event.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => openEventDetails(event)}
                    >
                      {event.image_url && (
                        <div className="w-full h-32 overflow-hidden">
                          <img 
                            src={event.image_url} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
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
                              {event.status === 'archived' && (
                                <Badge variant="secondary">Archived</Badge>
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
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <EventActionMenu
                                event={event}
                                onEdit={() => {
                                  setEditingEvent(event);
                                  setIsFormOpen(true);
                                }}
                                onDuplicate={() => setDuplicateModal({ isOpen: true, event })}
                                onArchive={() => handleArchiveEvent(event.id)}
                                onUnarchive={() => handleUnarchiveEvent(event.id)}
                                onDelete={() => handleDeleteEvent(event.id)}
                                onAttendance={() => openAttendanceModal(event)}
                                onImageUpload={() => setImageUploadModal({ isOpen: true, event })}
                                isSuperAdmin={isSuperAdmin}
                                canManageAttendance={canManageAttendance}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                   </LazyLoadWrapper>
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

        {/* Attendance Modal */}
        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={() => setAttendanceModal(prev => ({ ...prev, isOpen: false }))}
          eventId={attendanceModal.eventId}
          eventTitle={attendanceModal.eventTitle}
          teamIds={attendanceModal.teamIds}
        />

        {/* Event Details Modal */}
        <EventDetailsModal
          isOpen={eventDetailsModal.isOpen}
          onClose={() => setEventDetailsModal({ isOpen: false, event: null })}
          event={eventDetailsModal.event}
          onEdit={(event) => {
            setEditingEvent(event);
            setIsFormOpen(true);
            setEventDetailsModal({ isOpen: false, event: null });
          }}
          onDelete={(eventId, isHardDelete) => handleDeleteEvent(eventId, isHardDelete)}
          onAttendance={(event) => {
            openAttendanceModal(event);
            setEventDetailsModal({ isOpen: false, event: null });
          }}
          onDuplicate={(event) => {
            setDuplicateModal({ isOpen: true, event });
            setEventDetailsModal({ isOpen: false, event: null });
          }}
          onArchive={(eventId) => handleArchiveEvent(eventId)}
          onUnarchive={(eventId) => handleUnarchiveEvent(eventId)}
          onRefresh={() => refetch()}
        />

        {/* Duplicate Event Modal */}
        <DuplicateEventModal
          isOpen={duplicateModal.isOpen}
          onClose={() => setDuplicateModal({ isOpen: false, event: null })}
          onDuplicate={(options) => {
            if (duplicateModal.event) {
              handleDuplicateEvent(duplicateModal.event.id, options);
            }
          }}
          eventTitle={duplicateModal.event?.title || ''}
        />

        {/* Image Upload Modal */}
        <Dialog open={imageUploadModal.isOpen} onOpenChange={(open) => {
          if (!open) setImageUploadModal({ isOpen: false, event: null });
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Event Image
              </DialogTitle>
            </DialogHeader>
            {imageUploadModal.event && (
              <EventImageUpload
                eventId={imageUploadModal.event.id}
                currentImageUrl={imageUploadModal.event.image_url}
                onImageUpdate={(imageUrl) => {
                  // Update the event in state
                  if (imageUploadModal.event) {
                    const updatedEvent = { ...imageUploadModal.event, image_url: imageUrl };
                    setImageUploadModal({ isOpen: false, event: null });
                    debouncedRefetch(); // Refresh to show updated image
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Schedule;