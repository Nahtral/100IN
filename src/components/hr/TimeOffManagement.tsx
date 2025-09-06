import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  CalendarDays,
  Edit,
  Trash2,
  Archive,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    request_type: '',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchTimeOffRequests();
    if (isSuperAdmin) {
      fetchEmployees();
    }
  }, [isSuperAdmin]);

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

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_id')
        .eq('employment_status', 'active');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const calculateTotalDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleAddRequest = async () => {
    try {
      const totalDays = calculateTotalDays(formData.start_date, formData.end_date);
      
      const { error } = await supabase
        .from('time_off_requests')
        .insert([{
          ...formData,
          total_days: totalDays
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time off request created successfully.",
      });
      
      setAddModalOpen(false);
      setFormData({
        employee_id: '',
        request_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        status: 'pending'
      });
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: "Failed to create time off request.",
        variant: "destructive",
      });
    }
  };

  const handleEditRequest = async () => {
    if (!selectedRequest) return;

    try {
      const totalDays = calculateTotalDays(formData.start_date, formData.end_date);
      
      const { error } = await supabase
        .from('time_off_requests')
        .update({
          request_type: formData.request_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          total_days: totalDays,
          reason: formData.reason,
          status: formData.status
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time off request updated successfully.",
      });
      
      setEditModalOpen(false);
      setSelectedRequest(null);
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update time off request.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to delete this time off request?')) return;

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time off request deleted successfully.",
      });
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete time off request.",
        variant: "destructive",
      });
    }
  };

  const openDetailsModal = (request: TimeOffRequest) => {
    setSelectedRequest(request);
    setDetailsModalOpen(true);
  };

  const openEditModal = (request: TimeOffRequest) => {
    setSelectedRequest(request);
    setFormData({
      employee_id: request.employee_id,
      request_type: request.request_type,
      start_date: request.start_date,
      end_date: request.end_date,
      reason: request.reason || '',
      status: request.status
    });
    setEditModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({
      employee_id: '',
      request_type: '',
      start_date: '',
      end_date: '',
      reason: '',
      status: 'pending'
    });
    setAddModalOpen(true);
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
        <Card 
          className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
          onClick={() => isSuperAdmin && openDetailsModal(requests[0])}
        >
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

        <Card 
          className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
          onClick={() => isSuperAdmin && setFilterStatus('pending')}
        >
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

        <Card 
          className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
          onClick={() => isSuperAdmin && setFilterStatus('approved')}
        >
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

        <Card 
          className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
          onClick={() => isSuperAdmin && setFilterStatus('denied')}
        >
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
              {isSuperAdmin && (
                <Button onClick={openAddModal} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Request
                </Button>
              )}
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
                         <div className="flex items-center gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openDetailsModal(request)}
                             className="text-blue-600 hover:text-blue-700"
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           {isSuperAdmin && (
                             <>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => openEditModal(request)}
                                 className="text-yellow-600 hover:text-yellow-700"
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleDeleteRequest(request.id)}
                                 className="text-red-600 hover:text-red-700"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </>
                           )}
                           {request.status === 'pending' && (
                             <>
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
                             </>
                           )}
                         </div>
                       </TableCell>
                     )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Time Off Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Employee</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.employees?.first_name} {selectedRequest.employees?.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Employee ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.employees?.employee_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Request Type</Label>
                  <Badge variant="outline" className={getTypeColor(selectedRequest.request_type)}>
                    {selectedRequest.request_type}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusBadge(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedRequest.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Days</Label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.total_days} days</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Requested Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedRequest.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedRequest.reason || 'No reason provided'}
                </p>
              </div>
              {isSuperAdmin && selectedRequest.status === 'pending' && (
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      approveRequest(selectedRequest.id);
                      setDetailsModalOpen(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      denyRequest(selectedRequest.id);
                      setDetailsModalOpen(false);
                    }}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Request Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Time Off Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({...formData, employee_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="request_type">Request Type</Label>
              <Select value={formData.request_type} onValueChange={(value) => setFormData({...formData, request_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
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
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Optional reason for the request"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRequest} disabled={!formData.employee_id || !formData.request_type || !formData.start_date || !formData.end_date}>
                Create Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Request Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Time Off Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_request_type">Request Type</Label>
              <Select value={formData.request_type} onValueChange={(value) => setFormData({...formData, request_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_end_date">End Date</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_reason">Reason</Label>
              <Textarea
                id="edit_reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Optional reason for the request"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditRequest}>
                Update Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeOffManagement;