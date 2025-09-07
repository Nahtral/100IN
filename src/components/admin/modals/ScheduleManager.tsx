import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus,
  Edit,
  Trash2,
  MapPin
} from 'lucide-react';

interface ScheduleEntry {
  id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
  status: string;
  break_duration_minutes?: number;
}

interface ScheduleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName
}) => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    }
  }, [isOpen, employeeId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('shift_date', new Date().toISOString().split('T')[0])
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load schedule data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return schedules.filter(schedule => schedule.shift_date === dateString);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-50 text-blue-700';
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const handleQuickSchedule = () => {
    toast({
      title: "Schedule Assignment",
      description: `Opening quick schedule form for ${employeeName}`,
    });
  };

  const handleViewFullSchedule = () => {
    // Open the main schedule page with employee filter
    window.open(`/schedule?employee=${employeeId}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogDescription className="sr-only">
          Schedule management for {employeeName}
        </DialogDescription>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule - {employeeName}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleQuickSchedule}>
                <Plus className="h-4 w-4 mr-2" />
                Quick Schedule
              </Button>
              <Button onClick={handleViewFullSchedule}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Full Schedule
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Shifts</TabsTrigger>
            <TabsTrigger value="summary">Weekly Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Shifts for {selectedDate.toLocaleDateString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : (
                    <div className="space-y-3">
                      {getScheduleForDate(selectedDate).map((schedule) => (
                        <div key={schedule.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </span>
                            </div>
                            <Badge className={`text-xs ${getStatusColor(schedule.status)}`}>
                              {schedule.status}
                            </Badge>
                          </div>
                          {schedule.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {schedule.location}
                            </div>
                          )}
                          {schedule.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {schedule.notes}
                            </p>
                          )}
                        </div>
                      ))}
                      {getScheduleForDate(selectedDate).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No shifts scheduled for this date</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading upcoming shifts...</div>
                ) : schedules.length > 0 ? (
                  <div className="space-y-3">
                    {schedules.slice(0, 10).map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(schedule.shift_date).toLocaleDateString()}
                            </span>
                            <span className="text-muted-foreground">
                              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </span>
                          </div>
                          {schedule.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {schedule.location}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming shifts scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {schedules.filter(s => {
                      const shiftDate = new Date(s.shift_date);
                      const now = new Date();
                      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      return shiftDate >= weekStart && shiftDate <= weekEnd;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Scheduled shifts</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Next Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {schedules.filter(s => {
                      const shiftDate = new Date(s.shift_date);
                      const now = new Date();
                      const nextWeekStart = new Date(now.setDate(now.getDate() - now.getDay() + 7));
                      const nextWeekEnd = new Date(nextWeekStart);
                      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
                      return shiftDate >= nextWeekStart && shiftDate <= nextWeekEnd;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Scheduled shifts</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(
                      schedules.reduce((total, schedule) => {
                        const start = new Date(`2000-01-01T${schedule.start_time}`);
                        const end = new Date(`2000-01-01T${schedule.end_time}`);
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        return total + hours;
                      }, 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Total scheduled</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};