import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ArrowLeftRight,
  Archive,
  MoreHorizontal,
  CalendarDays,
  Timer,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, startOfDay, endOfDay } from 'date-fns';

interface EmployeeSchedulingProps {
  onStatsUpdate?: () => void;
}

const EmployeeScheduling: React.FC<EmployeeSchedulingProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [activeView, setActiveView] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    employee_id: '',
    shift_date: '',
    start_time: '',
    end_time: '',
    break_duration_minutes: 0,
    location: '',
    notes: ''
  });

  const [requestForm, setRequestForm] = useState({
    request_type: '',
    original_schedule_id: '',
    target_employee_id: '',
    reason: '',
    new_schedule_data: {}
  });

  useEffect(() => {
    fetchData();
  }, [currentDate, activeView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSchedules(),
        fetchRequests(),
        fetchEmployees(),
        fetchTemplates()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch scheduling data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    const { startDate, endDate } = getDateRange();
    
    const { data, error } = await supabase
      .from('employee_schedules')
      .select(`
        *,
        employees!inner (
          id,
          first_name,
          last_name,
          position,
          department
        )
      `)
      .gte('shift_date', startDate.toISOString().split('T')[0])
      .lte('shift_date', endDate.toISOString().split('T')[0])
      .order('shift_date', { ascending: true });

    if (error) throw error;
    setSchedules(data || []);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('schedule_change_requests')
      .select(`
        *,
        employees!schedule_change_requests_requester_id_fkey (
          first_name,
          last_name,
          position
        ),
        target_employee:employees!schedule_change_requests_target_employee_id_fkey (
          first_name,
          last_name,
          position
        ),
        original_schedule:employee_schedules!schedule_change_requests_original_schedule_id_fkey (
          shift_date,
          start_time,
          end_time
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setRequests(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employment_status', 'active')
      .order('first_name');

    if (error) throw error;
    setEmployees(data || []);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name');

    if (error) throw error;
    setTemplates(data || []);
  };

  const getDateRange = () => {
    switch (activeView) {
      case 'daily':
        return {
          startDate: startOfDay(currentDate),
          endDate: endOfDay(currentDate)
        };
      case 'weekly':
        return {
          startDate: startOfWeek(currentDate),
          endDate: endOfWeek(currentDate)
        };
      case 'monthly':
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(currentDate)
        };
      case 'quarterly':
        const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        return {
          startDate: quarterStart,
          endDate: quarterEnd
        };
      default:
        return {
          startDate: startOfWeek(currentDate),
          endDate: endOfWeek(currentDate)
        };
    }
  };

  const handleScheduleSubmit = async () => {
    try {
      if (selectedSchedule) {
        const { error } = await supabase
          .from('employee_schedules')
          .update({
            ...scheduleForm,
            break_duration_minutes: Number(scheduleForm.break_duration_minutes)
          })
          .eq('id', selectedSchedule.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Schedule updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('employee_schedules')
          .insert({
            ...scheduleForm,
            break_duration_minutes: Number(scheduleForm.break_duration_minutes),
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Schedule created successfully.",
        });
      }

      setShowScheduleModal(false);
      setSelectedSchedule(null);
      setScheduleForm({
        employee_id: '',
        shift_date: '',
        start_time: '',
        end_time: '',
        break_duration_minutes: 0,
        location: '',
        notes: ''
      });
      fetchData();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save schedule.",
        variant: "destructive",
      });
    }
  };

  const handleRequestApproval = async (requestId: string, status: 'approved' | 'denied', reviewNotes?: string) => {
    try {
      const { error } = await supabase
        .from('schedule_change_requests')
        .update({
          status,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Request ${status} successfully.`,
      });
      
      fetchData();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Schedule deleted successfully.",
      });
      
      fetchData();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule.",
        variant: "destructive",
      });
    }
  };

  const openScheduleModal = (schedule?: any) => {
    if (schedule) {
      setSelectedSchedule(schedule);
      setScheduleForm({
        employee_id: schedule.employee_id,
        shift_date: schedule.shift_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        break_duration_minutes: schedule.break_duration_minutes || 0,
        location: schedule.location || '',
        notes: schedule.notes || ''
      });
    } else {
      setSelectedSchedule(null);
      setScheduleForm({
        employee_id: '',
        shift_date: format(currentDate, 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '17:00',
        break_duration_minutes: 30,
        location: '',
        notes: ''
      });
    }
    setShowScheduleModal(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'confirmed': return 'secondary';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      case 'pending': return 'outline';
      case 'approved': return 'default';
      case 'denied': return 'destructive';
      default: return 'outline';
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
    <Card className="card-enhanced cursor-pointer hover:shadow-lg transition-all duration-200" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  const totalSchedules = schedules.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const todaySchedules = schedules.filter(s => s.shift_date === format(new Date(), 'yyyy-MM-dd')).length;

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Employee Scheduling</h2>
          <p className="text-muted-foreground">Manage employee schedules and change requests</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <div className="flex gap-2">
            <Button onClick={() => openScheduleModal()} className="btn-panthers">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
            <Button variant="outline" className="btn-secondary-panthers">
              <Timer className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Schedules"
          value={totalSchedules}
          icon={Calendar}
          color="text-primary"
          onClick={() => {}}
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          icon={Clock}
          color="text-orange-500"
          onClick={() => {}}
        />
        <StatCard
          title="Today's Shifts"
          value={todaySchedules}
          icon={Users}
          color="text-green-500"
          onClick={() => {}}
        />
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -1))}
            >
              ←
            </Button>
            <span className="text-sm font-medium min-w-32 text-center">
              {format(currentDate, 'MMM dd, yyyy')}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
            >
              →
            </Button>
          </div>
        </div>

        <TabsContent value={activeView} className="space-y-6">
          {/* Schedule Grid */}
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Schedule Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No schedules found for this period</p>
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <div 
                      key={schedule.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => isSuperAdmin && openScheduleModal(schedule)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {schedule.employees?.first_name} {schedule.employees?.last_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {schedule.employees?.position} • {schedule.employees?.department}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {format(new Date(schedule.shift_date), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {schedule.start_time} - {schedule.end_time}
                          </span>
                        </div>
                        {schedule.location && (
                          <span className="text-sm text-muted-foreground">
                            📍 {schedule.location}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(schedule.status)}>
                          {schedule.status}
                        </Badge>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openScheduleModal(schedule);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchedule(schedule.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Change Requests */}
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Schedule Change Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No change requests found</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {request.employees?.first_name} {request.employees?.last_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {request.request_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {request.original_schedule && format(new Date(request.original_schedule.shift_date), 'MMM dd')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {request.reason}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                        {isSuperAdmin && request.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRequestApproval(request.id, 'approved')}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRequestApproval(request.id, 'denied')}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select 
                value={scheduleForm.employee_id} 
                onValueChange={(value) => setScheduleForm({...scheduleForm, employee_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shift_date">Date</Label>
              <Input
                type="date"
                value={scheduleForm.shift_date}
                onChange={(e) => setScheduleForm({...scheduleForm, shift_date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                type="time"
                value={scheduleForm.start_time}
                onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                type="time"
                value={scheduleForm.end_time}
                onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="break_duration">Break Duration (minutes)</Label>
              <Input
                type="number"
                value={scheduleForm.break_duration_minutes}
                onChange={(e) => setScheduleForm({...scheduleForm, break_duration_minutes: Number(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({...scheduleForm, location: e.target.value})}
                placeholder="Office, Remote, etc."
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                placeholder="Additional notes about this shift..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSubmit} className="btn-panthers">
              {selectedSchedule ? 'Update' : 'Create'} Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeScheduling;