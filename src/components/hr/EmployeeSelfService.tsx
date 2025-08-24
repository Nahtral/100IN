import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  User, 
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EmployeeData {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  hire_date: string;
}

interface TimeOffRequest {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
}

interface Schedule {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  status: string;
}

const EmployeeSelfService: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [formData, setFormData] = useState({
    request_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchEmployeeData();
    fetchTimeOffRequests();
    fetchSchedules();
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setEmployeeData(data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employee information.",
        variant: "destructive",
      });
    }
  };

  const fetchTimeOffRequests = async () => {
    if (!employeeData) return;

    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', employeeData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTimeOffRequests(data || []);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time off requests.",
        variant: "destructive",
      });
    }
  };

  const fetchSchedules = async () => {
    if (!employeeData) return;

    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeData.id)
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', nextWeek.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch schedule information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitTimeOffRequest = async () => {
    if (!employeeData) return;

    try {
      const totalDays = calculateTotalDays(formData.start_date, formData.end_date);
      
      const { error } = await supabase
        .from('time_off_requests')
        .insert([{
          employee_id: employeeData.id,
          request_type: formData.request_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          total_days: totalDays,
          reason: formData.reason,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time off request submitted successfully.",
      });
      
      setShowTimeOffModal(false);
      setFormData({
        request_type: '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error submitting time off request:', error);
      toast({
        title: "Error",
        description: "Failed to submit time off request.",
        variant: "destructive",
      });
    }
  };

  const calculateTotalDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: { 
        className: 'bg-yellow-100 text-yellow-800', 
        icon: <Clock className="h-3 w-3" /> 
      },
      approved: { 
        className: 'bg-green-100 text-green-800', 
        icon: <CheckCircle className="h-3 w-3" /> 
      },
      denied: { 
        className: 'bg-red-100 text-red-800', 
        icon: <XCircle className="h-3 w-3" /> 
      }
    };
    
    const variant = variants[status] || { 
      className: 'bg-gray-100 text-gray-800', 
      icon: <AlertCircle className="h-3 w-3" /> 
    };
    
    return (
      <Badge className={`${variant.className} flex items-center gap-1`}>
        {variant.icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Employee Profile Not Found</h3>
        <p className="text-muted-foreground">
          Your employee profile hasn't been set up yet. Please contact HR for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employee Self-Service</h2>
          <p className="text-muted-foreground">Manage your time off, schedules, and profile</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="schedule">My Schedule</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {timeOffRequests.filter(r => r.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Approved Days</p>
                    <p className="text-2xl font-bold text-green-500">
                      {timeOffRequests
                        .filter(r => r.status === 'approved')
                        .reduce((sum, r) => sum + r.total_days, 0)}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming Shifts</p>
                    <p className="text-2xl font-bold text-primary">
                      {schedules.length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Recent Time Off Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeOffRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{request.request_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                  {timeOffRequests.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No time off requests</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Upcoming Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedules.slice(0, 3).map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(schedule.shift_date).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                        {schedule.location && (
                          <p className="text-xs text-muted-foreground">📍 {schedule.location}</p>
                        )}
                      </div>
                      <Badge variant="outline">{schedule.status}</Badge>
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No upcoming shifts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Time Off Requests</h3>
            <Dialog open={showTimeOffModal} onOpenChange={setShowTimeOffModal}>
              <DialogTrigger asChild>
                <Button className="btn-panthers">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Time Off
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Time Off Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="request_type">Request Type</Label>
                    <Select onValueChange={(value) => setFormData({...formData, request_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal Day</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Provide details about your request..."
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowTimeOffModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={submitTimeOffRequest}
                      disabled={!formData.request_type || !formData.start_date || !formData.end_date}
                      className="btn-panthers"
                    >
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="card-enhanced">
            <CardContent>
              <div className="space-y-4">
                {timeOffRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{request.request_type}</h4>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        ({request.total_days} days)
                      </p>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground">Reason: {request.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {timeOffRequests.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No time off requests</h3>
                    <p className="text-muted-foreground">Submit your first time off request above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{new Date(schedule.shift_date).toLocaleDateString()}</h4>
                      <p className="text-sm text-muted-foreground">
                        {schedule.start_time} - {schedule.end_time}
                      </p>
                      {schedule.location && (
                        <p className="text-sm text-muted-foreground">📍 {schedule.location}</p>
                      )}
                      {schedule.notes && (
                        <p className="text-sm text-muted-foreground">Note: {schedule.notes}</p>
                      )}
                    </div>
                    <Badge variant="outline">{schedule.status}</Badge>
                  </div>
                ))}
                {schedules.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No upcoming shifts</h3>
                    <p className="text-muted-foreground">Your schedule will appear here when available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Employee ID</Label>
                  <p className="text-sm font-medium">{employeeData.employee_id}</p>
                </div>
                <div>
                  <Label>Full Name</Label>
                  <p className="text-sm font-medium">{employeeData.first_name} {employeeData.last_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{employeeData.email}</p>
                </div>
                <div>
                  <Label>Position</Label>
                  <p className="text-sm font-medium">{employeeData.position}</p>
                </div>
                <div>
                  <Label>Department</Label>
                  <p className="text-sm font-medium">{employeeData.department || 'N/A'}</p>
                </div>
                <div>
                  <Label>Hire Date</Label>
                  <p className="text-sm font-medium">{new Date(employeeData.hire_date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeSelfService;