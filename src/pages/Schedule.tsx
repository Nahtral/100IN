
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, Users, Eye, Archive, CalendarDays, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import EnhancedScheduleForm from '@/components/forms/EnhancedScheduleForm';
import AttendanceModal from '@/components/attendance/AttendanceModal';
import ScheduleFilters from '@/components/schedule/ScheduleFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useScheduleCache } from '@/hooks/useScheduleCache';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { ErrorLogger } from '@/utils/errorLogger';
import { InputSanitizer } from '@/utils/inputSanitizer';

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<any>({});
  const [pageSize] = useState(20);
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
  const [eventDetailModal, setEventDetailModal] = useState<{
    isOpen: boolean;
    event: ScheduleEvent | null;
  }>({
    isOpen: false,
    event: null
  });
  
  const { user } = useAuth();
  const { userRole, isSuperAdmin } = useUserRole();
  const { currentUser } = useCurrentUser();
  const { trackPageView, trackUserAction } = useAnalytics();
  const { measureApiCall } = usePerformanceMonitoring('Schedule');
  const { toast } = useToast();
  
  // Use enhanced caching hook
  const { events, totalCount, loading, error, fetchEvents, invalidateCache } = useScheduleCache();

  useEffect(() => {
    trackPageView('Schedule');
  }, [trackPageView]);

  // Show error alert if loading failed
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Fetch events with current filters and pagination
  useEffect(() => {
    const currentFilters = {
      ...filters,
      ...(activeTab === 'upcoming' 
        ? { date_range: { start: new Date().toISOString(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() } }
        : { date_range: { start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() } }
      )
    };
    
    fetchEvents(currentFilters, { page: currentPage, limit: pageSize });
  }, [fetchEvents, filters, activeTab, currentPage, pageSize]);

  // Reset page when filters or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Memoized display events (already filtered by backend)
  const displayEvents = useMemo(() => {
    return events.sort((a, b) => {
      const aDate = new Date(a.start_time);
      const bDate = new Date(b.start_time);
      
      if (activeTab === 'upcoming') {
        // Prioritize today's events first for upcoming
        if (isToday(aDate) && !isToday(bDate)) return -1;
        if (!isToday(aDate) && isToday(bDate)) return 1;
        return aDate.getTime() - bDate.getTime();
      } else {
        // Most recent first for past events
        return bDate.getTime() - aDate.getTime();
      }
    });
  }, [events, activeTab]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const handleFiltersClear = useCallback(() => {
    setFilters({});
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSubmit = useCallback(async (formData: any) => {
    trackUserAction('schedule_form_submit', editingEvent ? 'edit' : 'create');
    setIsSubmitting(true);
    
    // Enhanced timeout with user notification
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Request Timeout",
        description: "The request is taking longer than expected. Please try again.",
        variant: "destructive",
      });
    }, 45000); // Increased to 45 seconds

    try {
      // Sanitize and validate input data
      const eventData = {
        title: InputSanitizer.sanitizeText(formData.title),
        event_type: formData.eventType,
        start_time: `${InputSanitizer.sanitizeDate(formData.startDate)}T${InputSanitizer.sanitizeTime(formData.startTime)}:00`,
        end_time: `${InputSanitizer.sanitizeDate(formData.endDate)}T${InputSanitizer.sanitizeTime(formData.endTime)}:00`,
        location: InputSanitizer.sanitizeText(formData.location),
        opponent: formData.opponent ? InputSanitizer.sanitizeText(formData.opponent) : null,
        description: formData.description ? InputSanitizer.sanitizeText(formData.description) : null,
        team_ids: formData.teamIds?.filter((id: string) => InputSanitizer.isValidUUID(id)) || [],
        is_recurring: Boolean(formData.isRecurring),
        recurrence_end_date: formData.isRecurring && formData.recurrenceEndDate ? 
          InputSanitizer.sanitizeDate(formData.recurrenceEndDate) : null,
        recurrence_pattern: formData.isRecurring ? formData.recurrencePattern : null,
        recurrence_days_of_week: formData.isRecurring && formData.recurrenceDaysOfWeek ? 
          formData.recurrenceDaysOfWeek : null,
        created_by: user?.id,
      };

      // Additional validation
      const startTime = new Date(eventData.start_time);
      const endTime = new Date(eventData.end_time);
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      let result;
      if (editingEvent) {
        const { data, error } = await measureApiCall('update_event', async () => {
          return await supabase
            .from('schedules')
            .update(eventData)
            .eq('id', editingEvent.id)
            .select();
        });

        if (error) throw error;
        result = data;

        toast({
          title: "Success",
          description: "Event updated successfully.",
        });
      } else {
        const { data, error } = await measureApiCall('create_event', async () => {
          return await supabase
            .from('schedules')
            .insert([eventData])
            .select();
        });

        if (error) throw error;
        result = data;

        toast({
          title: "Success",
          description: "Event created successfully.",
        });
      }

      clearTimeout(timeoutId);
      setIsFormOpen(false);
      setEditingEvent(null);
      
      // Invalidate cache and refetch with current filters
      invalidateCache();
      const currentFilters = {
        ...filters,
        ...(activeTab === 'upcoming' 
          ? { date_range: { start: new Date().toISOString(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() } }
          : { date_range: { start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() } }
        )
      };
      await fetchEvents(currentFilters, { page: currentPage, limit: pageSize });

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      await ErrorLogger.logError(error, {
        component: 'Schedule',
        action: editingEvent ? 'update_event' : 'create_event',
        userId: user?.id,
        userRole,
        metadata: { eventData: formData, editingEventId: editingEvent?.id }
      });
      
      let errorMessage = "Failed to save event.";
      if (error?.message?.includes('violates')) {
        errorMessage = "You don't have permission to perform this action.";
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Database error (${error.code}): ${error.details || error.hint || 'Unknown error'}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingEvent, user?.id, userRole, trackUserAction, measureApiCall, toast, invalidateCache, fetchEvents]);

  const initiateDelete = useCallback((eventId: string) => {
    trackUserAction('schedule_delete_attempt', 'event');
    setEventToDelete(eventId);
    setDeleteConfirmOpen(true);
  }, [trackUserAction]);

  const handleConfirmDelete = useCallback(async () => {
    if (!eventToDelete) return;

    try {
      trackUserAction('schedule_delete_confirmed', 'event');
      
      await measureApiCall('delete_event', async () => {
        const { error } = await supabase
          .from('schedules')
          .delete()
          .eq('id', eventToDelete);

        if (error) throw error;
      });

      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });
      
      // Invalidate cache and refetch with current filters
      invalidateCache();
      const currentFilters = {
        ...filters,
        ...(activeTab === 'upcoming' 
          ? { date_range: { start: new Date().toISOString(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() } }
          : { date_range: { start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() } }
        )
      };
      await fetchEvents(currentFilters, { page: currentPage, limit: pageSize });
      
    } catch (error) {
      await ErrorLogger.logError(error, {
        component: 'Schedule',
        action: 'delete_event',
        userId: user?.id,
        userRole,
        metadata: { eventId: eventToDelete }
      });

      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
    }
  }, [eventToDelete, user?.id, userRole, trackUserAction, measureApiCall, toast, invalidateCache, fetchEvents]);

  const openEditForm = useCallback((event: ScheduleEvent) => {
    trackUserAction('schedule_edit_open', 'event');
    setEditingEvent(event);
    setIsFormOpen(true);
  }, [trackUserAction]);

  const openAddForm = useCallback(() => {
    trackUserAction('schedule_add_open', 'form');
    setEditingEvent(null);
    setIsFormOpen(true);
  }, [trackUserAction]);

  const openAttendanceModal = useCallback((event: ScheduleEvent) => {
    trackUserAction('attendance_modal_open', 'event');
    setAttendanceModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
      teamIds: event.team_ids || []
    });
  }, [trackUserAction]);

  const closeAttendanceModal = useCallback(() => {
    setAttendanceModal({
      isOpen: false,
      eventId: '',
      eventTitle: '',
      teamIds: []
    });
  }, []);

  const openEventDetails = useCallback((event: ScheduleEvent) => {
    trackUserAction('event_details_open', 'event');
    setEventDetailModal({
      isOpen: true,
      event: event
    });
  }, [trackUserAction]);

  const closeEventDetails = useCallback(() => {
    setEventDetailModal({
      isOpen: false,
      event: null
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    trackUserAction('schedule_refresh', 'manual');
    invalidateCache();
    const currentFilters = {
      ...filters,
      ...(activeTab === 'upcoming' 
        ? { date_range: { start: new Date().toISOString(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() } }
        : { date_range: { start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() } }
      )
    };
    await fetchEvents(currentFilters, { page: currentPage, limit: pageSize });
  }, [trackUserAction, invalidateCache, fetchEvents, filters, activeTab, currentPage, pageSize]);

  const canManageAttendance = useMemo(() => 
    isSuperAdmin || userRole === 'staff' || userRole === 'coach', 
    [isSuperAdmin, userRole]
  );

  const getEventTypeColor = useCallback((type: string) => {
    switch (type.toLowerCase()) {
      case 'game': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'practice': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'training': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'meeting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }, []);

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600">Manage games and training sessions</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="transition-all duration-200 hover:scale-105"
              aria-label="Refresh events"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {(isSuperAdmin || userRole === 'staff') && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={openAddForm} 
                    className="bg-black hover:bg-gray-800 text-white transition-all duration-200 hover:scale-105 w-full sm:w-auto"
                    aria-label="Add new event"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEvent ? 'Edit Event' : 'Add New Event'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingEvent ? 'Modify the event details below.' : 'Fill in the details to create a new event.'}
                    </DialogDescription>
                  </DialogHeader>
                  <EnhancedScheduleForm
                    onSubmit={handleSubmit}
                    initialData={editingEvent ? {
                      title: editingEvent.title,
                      eventType: editingEvent.event_type as 'game' | 'practice' | 'meeting' | 'scrimmage' | 'tournament',
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
                    onCancel={() => setIsFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="link" onClick={handleRefresh} className="ml-2 h-auto p-0">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Advanced Filters */}
        <ScheduleFilters 
          onFiltersChange={handleFiltersChange}
          onClear={handleFiltersClear}
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Upcoming ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Past Events ({totalCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                  <div className="flex items-center gap-2">
                    {activeTab === 'upcoming' ? <CalendarDays className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                    {activeTab === 'upcoming' ? 'Upcoming Events' : 'Past Events'} ({totalCount})
                  </div>
                  <div className="text-sm font-normal text-gray-600">
                    Page {currentPage} of {totalPages} • Showing {displayEvents.length} of {totalCount}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading events...</p>
                  </div>
                ) : displayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      {activeTab === 'upcoming' ? 'No upcoming events. Add your first event to get started.' : 'No past events found.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayEvents.map((event, index) => {
                      const eventDate = new Date(event.start_time);
                      const isEventToday = isToday(eventDate);
                      
                      <div 
                        key={event.id} 
                        className={`border rounded-lg p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in cursor-pointer ${
                          isEventToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => openEventDetails(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{event.title}</h3>
                              <div className="flex flex-wrap items-center gap-2">
                                {isEventToday && (
                                  <Badge className="bg-blue-500 text-white animate-pulse">
                                    Today
                                  </Badge>
                                )}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEventDetails(event);
                          }}
                          title="View Details"
                          className="transition-all duration-200 hover:scale-110 hover:bg-blue-50"
                          aria-label={`View details for ${event.title}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageAttendance && event.team_ids && event.team_ids.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAttendanceModal(event);
                              }}
                              title="Track Attendance"
                              className="transition-all duration-200 hover:scale-110 hover:bg-blue-50"
                              aria-label={`Track attendance for ${event.title}`}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                        )}
                        {(isSuperAdmin || userRole === 'staff') && (
                          <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditForm(event);
                                }}
                                className="transition-all duration-200 hover:scale-110 hover:bg-gray-50"
                                aria-label={`Edit ${event.title}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  initiateDelete(event.id);
                                }}
                                className="transition-all duration-200 hover:scale-110 hover:bg-red-50"
                                aria-label={`Delete ${event.title}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                          </>
                          )}
                        </div>
                      </div>
                    );})}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={closeAttendanceModal}
          eventId={attendanceModal.eventId}
          eventTitle={attendanceModal.eventTitle}
          teamIds={attendanceModal.teamIds}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
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
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Event Details Modal */}
        <Dialog open={eventDetailModal.isOpen} onOpenChange={closeEventDetails}>
          <DialogContent className="max-w-2xl" role="dialog" aria-labelledby="event-details-title">
            <DialogHeader>
              <DialogTitle id="event-details-title" className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Details
              </DialogTitle>
              <DialogDescription>
                View detailed information about this event
              </DialogDescription>
            </DialogHeader>
            {eventDetailModal.event && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{eventDetailModal.event.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge className={getEventTypeColor(eventDetailModal.event.event_type)}>
                      {eventDetailModal.event.event_type}
                    </Badge>
                    {eventDetailModal.event.opponent && (
                      <Badge variant="outline">
                        vs {eventDetailModal.event.opponent}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Start Time</p>
                        <p className="text-gray-600">
                          {format(new Date(eventDetailModal.event.start_time), 'EEEE, MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">End Time</p>
                        <p className="text-gray-600">
                          {format(new Date(eventDetailModal.event.end_time), 'EEEE, MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-gray-600">{eventDetailModal.event.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {eventDetailModal.event.description && (
                  <div>
                    <p className="font-medium mb-2">Description</p>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded">{eventDetailModal.event.description}</p>
                  </div>
                )}
                
                {eventDetailModal.event.is_recurring && (
                  <div>
                    <p className="font-medium mb-2">Recurring Event</p>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-800">
                        This is a {eventDetailModal.event.recurrence_pattern} recurring event
                        {eventDetailModal.event.recurrence_end_date && 
                          ` until ${format(new Date(eventDetailModal.event.recurrence_end_date), 'MMM dd, yyyy')}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Attendance Actions in Detail Modal */}
                {canManageAttendance && eventDetailModal.event.team_ids && eventDetailModal.event.team_ids.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Event Management</h4>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          closeEventDetails();
                          openAttendanceModal(eventDetailModal.event!);
                        }}
                        className="flex items-center gap-2"
                        aria-label="Track attendance for this event"
                      >
                        <Users className="h-4 w-4" />
                        Track Attendance
                      </Button>
                      {(isSuperAdmin || userRole === 'staff') && (
                        <Button 
                          variant="outline"
                          onClick={() => {
                            closeEventDetails();
                            openEditForm(eventDetailModal.event!);
                          }}
                          className="flex items-center gap-2"
                          aria-label="Edit this event"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Event
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Schedule;
