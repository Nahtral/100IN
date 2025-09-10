import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TeamEmployee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  employment_status: string;
}

interface TimeOffRequest {
  id: string;
  employee_id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface Schedule {
  id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

const CoachHRView: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [teamEmployees, setTeamEmployees] = useState<TeamEmployee[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTeamEmployees();
    fetchTimeOffRequests();
    fetchSchedules();
  }, [user, selectedDate]);

  const fetchTeamEmployees = async () => {
    try {
      // Get employees from teams where the current user is a coach
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('coach_id', user?.id);

      if (teamsError) throw teamsError;

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        
        // Get players from these teams via the junction table
        const { data: playerTeams, error: playersError } = await supabase
          .from('player_teams')
          .select('player_id, players(user_id)')
          .in('team_id', teamIds);

        if (playersError) throw playersError;

        if (playerTeams && playerTeams.length > 0) {
          const userIds = playerTeams
            .map((pt: any) => pt.players?.user_id)
            .filter(Boolean);
          
          // Get employee records for these users
          const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('*')
            .in('user_id', userIds)
            .eq('employment_status', 'active');

          if (employeesError) throw employeesError;
          setTeamEmployees(employees || []);
        }
      }
    } catch (error) {
      console.error('Error fetching team employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team employee information.",
        variant: "destructive",
      });
    }
  };

  const fetchTimeOffRequests = async () => {
    if (teamEmployees.length === 0) return;

    try {
      const employeeIds = teamEmployees.map(e => e.id);
      
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_id
          )
        `)
        .in('employee_id', employeeIds)
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
    if (teamEmployees.length === 0) return;

    try {
      const employeeIds = teamEmployees.map(e => e.id);
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_id
          )
        `)
        .in('employee_id', employeeIds)
        .eq('shift_date', selectedDate)
        .order('start_time', { ascending: true });

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    totalEmployees: teamEmployees.length,
    pendingRequests: timeOffRequests.filter(r => r.status === 'pending').length,
    todayScheduled: schedules.length,
    approvedRequests: timeOffRequests.filter(r => r.status === 'approved').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team HR Overview</h2>
          <p className="text-muted-foreground">View your team's HR information and schedules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold text-primary">{stats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-500">{stats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Shifts</p>
                <p className="text-2xl font-bold text-green-500">{stats.todayScheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved Leave</p>
                <p className="text-2xl font-bold text-blue-500">{stats.approvedRequests}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">Team Members</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off Requests</TabsTrigger>
          <TabsTrigger value="schedule">Daily Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              {teamEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No team members found</h3>
                  <p className="text-muted-foreground">No employees are assigned to your teams</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {employee.employee_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(employee.employment_status)}>
                            {employee.employment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-6">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Time Off Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No time off requests</h3>
                  <p className="text-muted-foreground">No time off requests from your team</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeOffRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {request.employees?.first_name} {request.employees?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {request.employees?.employee_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.request_type}</Badge>
                        </TableCell>
                        <TableCell>{new Date(request.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(request.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>{request.total_days} days</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={request.reason}>
                            {request.reason || 'No reason provided'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Schedule for {new Date(selectedDate).toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No shifts scheduled</h3>
                  <p className="text-muted-foreground">No team members are scheduled for this date</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {schedule.employees?.first_name} {schedule.employees?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {schedule.employees?.employee_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{schedule.start_time}</TableCell>
                        <TableCell>{schedule.end_time}</TableCell>
                        <TableCell>{schedule.location || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(schedule.status)}>
                            {schedule.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoachHRView;