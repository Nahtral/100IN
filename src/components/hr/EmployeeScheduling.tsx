import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
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
  User,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Employee {
  employee_id: string;
  full_name: string;
  email: string;
  role: string;
  role_display: string;
  phone?: string;
}

interface EmployeeSchedulingProps {
  onStatsUpdate?: () => void;
}

const EmployeeScheduling: React.FC<EmployeeSchedulingProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const [activeView, setActiveView] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [eligibleEmployees, setEligibleEmployees] = useState<any[]>([]); // Employees who are also coaches, staff, or super admin
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showTotalSchedulesModal, setShowTotalSchedulesModal] = useState(false);
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false);
  const [showTodayShiftsModal, setShowTodayShiftsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

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

  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    description: '',
    department: '',
    position: '',
    start_time: '',
    end_time: '',
    break_duration_minutes: 30,
    days_of_week: [] as number[],
    location: ''
  });

  const [requestForm, setRequestForm] = useState({
    request_type: '',
    original_schedule_id: '',
    target_employee_id: '',
    reason: '',
    new_schedule_data: {}
  });

  // Additional state for form handling
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        fetchEligibleEmployees(),
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
        employees!employee_schedules_employee_id_fkey (
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
        requester:employees!schedule_change_requests_requester_id_fkey (
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

  const fetchEmployees = async (query: string = '') => {
    try {
      setIsLoadingEmployees(true);
      console.log('Fetching employees with query:', query);
      
      // Use RPC function as preferred method
      const { data, error } = await supabase.rpc('rpc_get_employees', {
        q: query,
        lim: 50,
        off: 0
      });

      if (error) {
        console.error('RPC call failed:', error);
        toast({
          title: "Error",
          description: `Failed to fetch employees: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('RPC success, fetched employees:', data);
      console.log('Employee count:', data?.length);
      setEmployees(data || []);

      if (!data || data.length === 0) {
        console.log('No employees found for query:', query);
      }
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchEligibleEmployees = async () => {
    // Fetch employees who also have coach, staff, or super_admin roles
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        position,
        department,
        email,
        user_id,
        profiles!employees_user_id_fkey (
          id,
          full_name
        )
      `)
      .eq('employment_status', 'active')
      .order('first_name');

    if (error) {
      console.error('Error fetching eligible employees:', error);
      return;
    }

    // Fetch user roles separately for each employee
    const processedData = [];
    for (const emp of data || []) {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', emp.user_id)
        .eq('is_active', true)
        .in('role', ['super_admin', 'staff', 'coach']);
      
      if (rolesData && rolesData.length > 0) {
        processedData.push({
          ...emp,
          roles: rolesData.map((r: any) => r.role),
          full_name: (emp.profiles as any)?.full_name || `${emp.first_name} ${emp.last_name}`
        });
      }
    }
    
    setEligibleEmployees(processedData);
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
    // Validate required fields
    if (!scheduleForm.employee_id) {
      toast({
        title: "Validation Error",
        description: "Please select an employee.",
        variant: "destructive",
      });
      return;
    }
    
    if (!scheduleForm.shift_date) {
      toast({
        title: "Validation Error", 
        description: "Please select a date.",
        variant: "destructive",
      });
      return;
    }
    
    if (!scheduleForm.start_time) {
      toast({
        title: "Validation Error",
        description: "Please enter a start time.",
        variant: "destructive",
      });
      return;
    }
    
    if (!scheduleForm.end_time) {
      toast({
        title: "Validation Error",
        description: "Please enter an end time.",
        variant: "destructive",
      });
      return;
    }

    // Validate time format and logic
    const startDateTime = new Date(`1970-01-01T${scheduleForm.start_time}:00`);
    const endDateTime = new Date(`1970-01-01T${scheduleForm.end_time}:00`);
    
    if (endDateTime <= startDateTime) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving schedule with data:', {
        ...scheduleForm,
        break_duration_minutes: Number(scheduleForm.break_duration_minutes)
      });
      
      // Get current user for created_by field
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create schedules.",
          variant: "destructive",
        });
        return;
      }

      if (selectedSchedule) {
        const { error } = await supabase
          .from('employee_schedules')
          .update({
            ...scheduleForm,
            break_duration_minutes: Number(scheduleForm.break_duration_minutes)
          })
          .eq('id', selectedSchedule.id);

        if (error) {
          console.error('Error updating schedule:', error);
          
          // Provide specific error messages based on error type
          let errorMessage = "Failed to update schedule.";
          if (error.code === '23503') {
            errorMessage = "Invalid employee selected. Please refresh and try again.";
          } else if (error.code === '23505') {
            errorMessage = "A schedule already exists for this employee at this time.";
          } else if (error.message) {
            errorMessage = `Database error: ${error.message}`;
          }
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Success",
          description: "Schedule updated successfully.",
        });
      } else {
        const { data, error } = await supabase
          .from('employee_schedules')
          .insert({
            ...scheduleForm,
            break_duration_minutes: Number(scheduleForm.break_duration_minutes),
            created_by: user.user.id
          })
          .select();

        if (error) {
          console.error('Error creating schedule:', error);
          
          // Provide specific error messages based on error type
          let errorMessage = "Failed to save schedule.";
          if (error.code === '23503') {
            errorMessage = "Invalid employee selected. Please refresh and try again.";
          } else if (error.code === '23505') {
            errorMessage = "A schedule already exists for this employee at this time.";
          } else if (error.message) {
            errorMessage = `Database error: ${error.message}`;
          }
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        console.log('Schedule created successfully:', data);
        toast({
          title: "Success",
          description: "Schedule created successfully!",
        });
      }

      // Reset form and close modal
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
      
      // Refresh data
      fetchData();
      onStatsUpdate?.();
    } catch (error: any) {
      console.error('Error in handleScheduleSubmit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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

  const handleArchiveSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .update({ status: 'cancelled' })
        .eq('id', scheduleId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Schedule archived successfully.",
      });
      
      fetchData();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error archiving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to archive schedule.",
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

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_change_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Request deleted successfully.",
      });
      
      fetchData();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request.",
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

  const openTemplateModal = (template?: any) => {
    if (template) {
      setSelectedTemplate(template);
      setTemplateForm({
        template_name: template.template_name,
        description: template.description || '',
        department: template.department || '',
        position: template.position || '',
        start_time: template.start_time,
        end_time: template.end_time,
        break_duration_minutes: template.break_duration_minutes || 30,
        days_of_week: template.days_of_week || [],
        location: template.location || ''
      });
    } else {
      setSelectedTemplate(null);
      setTemplateForm({
        template_name: '',
        description: '',
        department: '',
        position: '',
        start_time: '09:00',
        end_time: '17:00',
        break_duration_minutes: 30,
        days_of_week: [],
        location: ''
      });
    }
    setShowCreateTemplateModal(true);
  };

  const handleTemplateSubmit = async () => {
    try {
      if (selectedTemplate) {
        const { error } = await supabase
          .from('shift_templates')
          .update({
            ...templateForm,
            break_duration_minutes: Number(templateForm.break_duration_minutes)
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Template updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('shift_templates')
          .insert({
            ...templateForm,
            break_duration_minutes: Number(templateForm.break_duration_minutes),
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Template created successfully.",
        });
      }

      setShowCreateTemplateModal(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('shift_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Template deleted successfully.",
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = (template: any) => {
    setTemplateForm({
      template_name: template.template_name,
      description: template.description || '',
      department: template.department || '',
      position: template.position || '',
      start_time: template.start_time,
      end_time: template.end_time,
      break_duration_minutes: template.break_duration_minutes || 30,
      days_of_week: template.days_of_week || [],
      location: template.location || ''
    });
    
    setScheduleForm({
      employee_id: '',
      shift_date: format(currentDate, 'yyyy-MM-dd'),
      start_time: template.start_time,
      end_time: template.end_time,
      break_duration_minutes: template.break_duration_minutes || 30,
      location: template.location || '',
      notes: `Applied from template: ${template.template_name}`
    });

    setShowTemplateModal(false);
    setShowScheduleModal(true);

    toast({
      title: "Template Applied",
      description: `Applied "${template.template_name}" template to new schedule.`,
    });
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNumber] || dayNumber.toString();
  };

  const toggleDay = (day: number) => {
    const newDays = templateForm.days_of_week.includes(day)
      ? templateForm.days_of_week.filter(d => d !== day)
      : [...templateForm.days_of_week, day].sort();
    setTemplateForm({...templateForm, days_of_week: newDays});
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

  const handleCardClick = (cardType: string) => {
    if (isSuperAdmin) {
      switch (cardType) {
        case 'total':
          setShowTotalSchedulesModal(true);
          break;
        case 'pending':
          setShowPendingRequestsModal(true);
          break;
        case 'today':
          setShowTodayShiftsModal(true);
          break;
      }
    }
  };

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
            <Button 
              variant="outline" 
              className="btn-secondary-panthers"
              onClick={() => setShowTemplateModal(true)}
            >
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
          onClick={() => handleCardClick('total')}
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          icon={Clock}
          color="text-orange-500"
          onClick={() => handleCardClick('pending')}
        />
        <StatCard
          title="Today's Shifts"
          value={todaySchedules}
          icon={Users}
          color="text-green-500"
          onClick={() => handleCardClick('today')}
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
              <div className="space-y-2">
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <Select 
                  value={scheduleForm.employee_id} 
                  onValueChange={(value) => setScheduleForm({...scheduleForm, employee_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingEmployees ? (
                      <div className="p-2">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : employees.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No active employees found
                      </div>
                    ) : (
                      employees.map((employee) => (
                        <SelectItem key={employee.employee_id} value={employee.employee_id}>
                          {employee.full_name} - {employee.role_display}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
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
            <Button 
              variant="outline" 
              onClick={() => setShowScheduleModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleSubmit} 
              className="btn-panthers"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedSchedule ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                `${selectedSchedule ? 'Update' : 'Create'} Schedule`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Total Schedules Detail Modal */}
      <Dialog open={showTotalSchedulesModal} onOpenChange={setShowTotalSchedulesModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Schedules Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                {totalSchedules} total schedules in the system
              </p>
              {isSuperAdmin && (
                <Button onClick={() => openScheduleModal()} className="btn-panthers">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        {schedule.employees?.first_name} {schedule.employees?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.employees?.position} • {format(new Date(schedule.shift_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">{schedule.start_time} - {schedule.end_time}</p>
                      {schedule.location && (
                        <p className="text-sm text-muted-foreground">📍 {schedule.location}</p>
                      )}
                    </div>
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
                          onClick={() => openScheduleModal(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleArchiveSchedule(schedule.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No schedules found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Requests Detail Modal */}
      <Dialog open={showPendingRequestsModal} onOpenChange={setShowPendingRequestsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Requests Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {pendingRequests} pending requests requiring approval
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {requests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        {request.employees?.first_name} {request.employees?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.request_type.replace('_', ' ')} • {request.employees?.position}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{request.reason}</p>
                      <p className="text-sm text-muted-foreground">
                        Created: {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                    {isSuperAdmin && (
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteRequest(request.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {requests.filter(r => r.status === 'pending').length === 0 && (
                <p className="text-center text-muted-foreground py-8">No pending requests found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Today's Shifts Detail Modal */}
      <Dialog open={showTodayShiftsModal} onOpenChange={setShowTodayShiftsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Today's Shifts Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                {todaySchedules} shifts scheduled for today ({format(new Date(), 'MMM dd, yyyy')})
              </p>
              {isSuperAdmin && (
                <Button onClick={() => openScheduleModal()} className="btn-panthers">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Today's Shift
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {schedules.filter(s => s.shift_date === format(new Date(), 'yyyy-MM-dd')).map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        {schedule.employees?.first_name} {schedule.employees?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.employees?.position} • {schedule.employees?.department}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{schedule.start_time} - {schedule.end_time}</p>
                      {schedule.location && (
                        <p className="text-sm text-muted-foreground">📍 {schedule.location}</p>
                      )}
                    </div>
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
                          onClick={() => openScheduleModal(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleArchiveSchedule(schedule.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {schedules.filter(s => s.shift_date === format(new Date(), 'yyyy-MM-dd')).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No shifts scheduled for today</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Schedule Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Manage reusable schedule templates for common shift patterns
              </p>
              {isSuperAdmin && (
                <Button 
                  className="btn-panthers"
                  onClick={() => openTemplateModal()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found</p>
                  <p className="text-sm">Create templates to quickly schedule common shift patterns</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{template.template_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.description || 'No description'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {template.start_time} - {template.end_time}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Break: {template.break_duration_minutes || 0} min
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {template.department || 'All Departments'}
                      </Badge>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Use Template"
                            onClick={() => {
                              // Pre-fill schedule form with template data
                              setScheduleForm({
                                employee_id: '',
                                shift_date: format(new Date(), 'yyyy-MM-dd'),
                                start_time: template.start_time,
                                end_time: template.end_time,
                                break_duration_minutes: template.break_duration_minutes || 30,
                                location: template.location || '',
                                notes: `Using template: ${template.template_name}`
                              });
                              setShowTemplateModal(false);
                              setShowScheduleModal(true);
                            }}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Edit Template"
                            onClick={() => openTemplateModal(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Delete Template"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Modal */}
      <Dialog open={showCreateTemplateModal} onOpenChange={setShowCreateTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm({...templateForm, template_name: e.target.value})}
                  placeholder="e.g., Morning Shift"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  value={templateForm.department}
                  onChange={(e) => setTemplateForm({...templateForm, department: e.target.value})}
                  placeholder="e.g., General, Sports, Medical"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  value={templateForm.position}
                  onChange={(e) => setTemplateForm({...templateForm, position: e.target.value})}
                  placeholder="e.g., Staff, Coach, Medical Staff"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  value={templateForm.location}
                  onChange={(e) => setTemplateForm({...templateForm, location: e.target.value})}
                  placeholder="e.g., Main Office, Training Facility"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  type="time"
                  value={templateForm.start_time}
                  onChange={(e) => setTemplateForm({...templateForm, start_time: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  type="time"
                  value={templateForm.end_time}
                  onChange={(e) => setTemplateForm({...templateForm, end_time: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="break_duration">Break Duration (minutes)</Label>
                <Input
                  type="number"
                  value={templateForm.break_duration_minutes}
                  onChange={(e) => setTemplateForm({...templateForm, break_duration_minutes: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={templateForm.days_of_week.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day)}
                  >
                    {getDayName(day)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                placeholder="Brief description of this template..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateTemplateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTemplateSubmit} className="btn-panthers">
              {selectedTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeScheduling;