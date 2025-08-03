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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  CalendarDays
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

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

interface TimeOffManagementProps {
  onStatsUpdate: () => void;
}

const TimeOffManagement: React.FC<TimeOffManagementProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTimeOffRequests();
  }, []);

  const fetchTimeOffRequests = async () => {
    try {
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time off requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time off request approved.",
      });
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const denyRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'denied' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time off request denied.",
      });
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({
        title: "Error",
        description: "Failed to deny request.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      vacation: 'text-blue-600',
      sick: 'text-red-600',
      personal: 'text-purple-600',
      emergency: 'text-orange-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(req => req.status === filterStatus);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    denied: requests.filter(r => r.status === 'denied').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Time Off Management</h2>
          <p className="text-muted-foreground">Manage employee time off requests and schedules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enhanced">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Denied</p>
                <p className="text-2xl font-bold text-red-500">{stats.denied}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Off Requests</CardTitle>
            <div className="flex items-center gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No time off requests found</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'all' 
                  ? 'No time off requests have been submitted yet' 
                  : `No ${filterStatus} requests found`}
              </p>
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
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  {(isSuperAdmin || hasRole('staff')) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
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
                      <Badge variant="outline" className={getTypeColor(request.request_type)}>
                        {request.request_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(request.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(request.end_date).toLocaleDateString()}</TableCell>
                    <TableCell>{request.total_days} days</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason || 'No reason provided'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    {(isSuperAdmin || hasRole('staff')) && (
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveRequest(request.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => denyRequest(request.id)}
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

export default TimeOffManagement;