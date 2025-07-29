
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ScheduleForm from '@/components/forms/ScheduleForm';
import AttendanceModal from '@/components/attendance/AttendanceModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  recurrence_end_date?: string;
  recurrence_pattern?: string;
  recurrence_days_of_week?: number[];
}

const Schedule = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const { user } = useAuth();
  const { userRole, isSuperAdmin } = useUserRole();
  const { trackPageView, trackUserAction } = useAnalytics();
  const { metrics, measureApiCall } = usePerformanceMonitoring('Schedule');
  const { toast } = useToast();

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || "User",
    role: "Coach",
    avatar: user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || "U"
  };

  useEffect(() => {
    trackPageView('Schedule');
    fetchEvents();
  }, [trackPageView]);

  const fetchEvents = async () => {
    try {
      const result = await measureApiCall('fetch_schedules', async () => {
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .order('start_time', { ascending: true });

        if (error) throw error;
        return data;
      });
      setEvents(result || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    trackUserAction('schedule_form_submit', editingEvent ? 'edit' : 'create');
    setIsSubmitting(true);
    try {
      const eventData = {
        title: formData.title,
        event_type: formData.eventType,
        start_time: `${formData.startDate}T${formData.startTime}:00`,
        end_time: `${formData.endDate}T${formData.endTime}:00`,
        location: formData.location,
        opponent: formData.opponent,
        description: formData.description,
        team_ids: formData.teamIds || [],
        is_recurring: formData.isRecurring || false,
        recurrence_end_date: formData.isRecurring && formData.recurrenceEndDate ? formData.recurrenceEndDate : null,
        recurrence_pattern: formData.isRecurring ? formData.recurrencePattern : null,
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
          description: "Event updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([eventData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Event created successfully.",
        });
      }

      setIsFormOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    trackUserAction('schedule_delete_attempt', 'event');
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      trackUserAction('schedule_delete_confirmed', 'event');
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });
      
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (event: ScheduleEvent) => {
    trackUserAction('schedule_edit_open', 'event');
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    trackUserAction('schedule_add_open', 'form');
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const openAttendanceModal = (event: ScheduleEvent) => {
    trackUserAction('attendance_modal_open', 'event');
    setAttendanceModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
      teamIds: event.team_ids || []
    });
  };

  const closeAttendanceModal = () => {
    setAttendanceModal({
      isOpen: false,
      eventId: '',
      eventTitle: '',
      teamIds: []
    });
  };

  const canManageAttendance = isSuperAdmin || userRole === 'staff' || userRole === 'coach';

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'game': return 'bg-red-100 text-red-800';
      case 'practice': return 'bg-blue-100 text-blue-800';
      case 'training': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600">Manage games and training sessions</p>
          </div>
          {(isSuperAdmin || userRole === 'staff') && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddForm} className="bg-orange-500 hover:bg-orange-600 transition-all duration-200 hover:scale-105 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Edit Event' : 'Add New Event'}
                </DialogTitle>
              </DialogHeader>
              <ScheduleForm
                onSubmit={handleSubmit}
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
                  recurrenceEndDate: editingEvent.recurrence_end_date || '',
                  recurrencePattern: editingEvent.recurrence_pattern as 'weekly' | 'monthly' | undefined,
                  recurrenceDaysOfWeek: editingEvent.recurrence_days_of_week || [],
                } : undefined}
                isLoading={isSubmitting}
              />
            </DialogContent>
          </Dialog>
          )}
        </div>
        
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5" />
              Upcoming Events ({events.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No events scheduled. Add your first event to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div 
                    key={event.id} 
                    className="border rounded-lg p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in bg-white"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${getEventTypeColor(event.event_type)} transition-all duration-200 hover:scale-105`}>
                            {event.event_type}
                          </Badge>
                          {event.opponent && (
                            <Badge variant="outline" className="transition-all duration-200 hover:scale-105">
                              vs {event.opponent}
                            </Badge>
                          )}
                        </div>
                      </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(event.start_time), 'MMM dd, yyyy • h:mm a')} - 
                              {format(new Date(event.end_time), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-gray-700">{event.description}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0 sm:ml-4">
                        {canManageAttendance && event.team_ids && event.team_ids.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAttendanceModal(event)}
                              title="Track Attendance"
                              className="transition-all duration-200 hover:scale-110 hover:bg-blue-50"
                            >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        {(isSuperAdmin || userRole === 'staff') && (
                          <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditForm(event)}
                                className="transition-all duration-200 hover:scale-110 hover:bg-gray-50"
                              >
                              <Edit className="h-4 w-4" />
                            </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(event.id)}
                                className="transition-all duration-200 hover:scale-110 hover:bg-red-50"
                              >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={closeAttendanceModal}
          eventId={attendanceModal.eventId}
          eventTitle={attendanceModal.eventTitle}
          teamIds={attendanceModal.teamIds}
        />
      </div>
    </Layout>
  );
};

export default Schedule;
