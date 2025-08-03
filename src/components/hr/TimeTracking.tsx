import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Calendar,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  overtime_hours: number;
  entry_type: string;
  notes: string | null;
  approval_status: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface TimeTrackingProps {
  onStatsUpdate: () => void;
}

const TimeTracking: React.FC<TimeTrackingProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTimeEntries();
  }, [selectedDate]);

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_id
          )
        `)
        .gte('clock_in', `${selectedDate}T00:00:00`)
        .lt('clock_in', `${selectedDate}T23:59:59`)
        .order('clock_in', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveTimeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ approval_status: 'approved' })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry approved.",
      });
      fetchTimeEntries();
    } catch (error) {
      console.error('Error approving time entry:', error);
      toast({
        title: "Error",
        description: "Failed to approve time entry.",
        variant: "destructive",
      });
    }
  };

  const rejectTimeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ approval_status: 'rejected' })
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry rejected.",
      });
      fetchTimeEntries();
    } catch (error) {
      console.error('Error rejecting time entry:', error);
      toast({
        title: "Error",
        description: "Failed to reject time entry.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (hours: number | null) => {
    if (!hours) return 'N/A';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Time Tracking</h2>
          <p className="text-muted-foreground">Track and manage employee working hours</p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours Today</p>
                <p className="text-2xl font-bold text-primary">
                  {formatDuration(timeEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold text-green-500">
                  {timeEntries.filter(entry => !entry.clock_out).length}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-500">
                  {timeEntries.filter(entry => entry.approval_status === 'pending').length}
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
                <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
                <p className="text-2xl font-bold text-red-500">
                  {formatDuration(timeEntries.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Time Entries for {new Date(selectedDate).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
              <p className="text-muted-foreground">No time entries recorded for the selected date</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  {(isSuperAdmin || hasRole('staff')) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">
                            {entry.employees?.first_name} {entry.employees?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.employees?.employee_id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(entry.clock_in)}</TableCell>
                    <TableCell>
                      {entry.clock_out ? (
                        formatTime(entry.clock_out)
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDuration(entry.total_hours)}</TableCell>
                    <TableCell>
                      {entry.overtime_hours > 0 ? formatDuration(entry.overtime_hours) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.entry_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(entry.approval_status)}>
                        {entry.approval_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.notes || '-'}</TableCell>
                    {(isSuperAdmin || hasRole('staff')) && (
                      <TableCell>
                        {entry.approval_status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveTimeEntry(entry.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => rejectTimeEntry(entry.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTracking;