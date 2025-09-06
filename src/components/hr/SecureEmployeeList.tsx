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
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  Calendar,
  Building,
  Shield,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import EmployeeForm from './EmployeeForm';

interface SecureEmployee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hire_date: string;
  employment_status: string;
  payment_type: string;
  role: string;
  role_active: boolean;
  role_display: string;
  approval_status: string;
  created_at: string;
  updated_at?: string;
  has_compensation_access?: boolean;
}

interface CompensationData {
  employee_id: string;
  hourly_rate: number;
  salary: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface SecureEmployeeListProps {
  onStatsUpdate: () => void;
}

const SecureEmployeeList: React.FC<SecureEmployeeListProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [employees, setEmployees] = useState<SecureEmployee[]>([]);
  const [compensationData, setCompensationData] = useState<Record<string, CompensationData>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SecureEmployee | null>(null);
  const [viewingCompensation, setViewingCompensation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Use secure function that automatically handles access control
      const { data, error } = await supabase.rpc('get_employees_secure');

      if (error) throw error;
      
      setEmployees(data || []);
      
      // Log the access for security audit
      if (data && data.length > 0) {
        await supabase.rpc('log_employee_access', {
          accessed_employee_id: null,
          access_type: 'employee_list_view',
          includes_sensitive_data: false
        });
      }
      
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees. You may not have permission to view employee data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompensationData = async (employeeId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_employee_compensation_secure', {
        employee_uuid: employeeId
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCompensationData(prev => ({
          ...prev,
          [employeeId]: data[0]
        }));
        
        // Log sensitive data access
        await supabase.rpc('log_employee_access', {
          accessed_employee_id: employeeId,
          access_type: 'compensation_view',
          includes_sensitive_data: true
        });
      }
    } catch (error) {
      console.error('Error fetching compensation data:', error);
      toast({
        title: "Access Denied",
        description: "You don't have permission to view compensation data.",
        variant: "destructive",
      });
    }
  };

  const toggleCompensationView = async (employeeId: string) => {
    const isCurrentlyViewing = viewingCompensation[employeeId];
    
    if (!isCurrentlyViewing) {
      await fetchCompensationData(employeeId);
    }
    
    setViewingCompensation(prev => ({
      ...prev,
      [employeeId]: !isCurrentlyViewing
    }));
  };

  const filteredEmployees = employees.filter(employee =>
    `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditEmployee = (employee: SecureEmployee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    try {
      // Only super admins can delete employees (as per RLS policy)
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee deleted successfully.",
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee. You may not have permission.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    };
    return variants[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employees</h2>
          <p className="text-muted-foreground">Secure employee information management</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingEmployee(null);
          }}>
            <DialogTrigger asChild>
              <Button className="btn-panthers">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              </DialogHeader>
              <EmployeeForm 
                employee={editingEmployee} 
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingEmployee(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Secure Employee Directory
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding a new employee'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Sensitive data is protected and only shown to authorized users
                </p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Contact</TableHead>
                    {(isSuperAdmin || hasRole('staff')) && <TableHead>Compensation</TableHead>}
                    {(isSuperAdmin || hasRole('staff')) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <React.Fragment key={employee.id}>
                      <TableRow>
                        <TableCell className="font-medium">{employee.employee_id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {employee.department || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(employee.employment_status)}>
                            {employee.employment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(employee.hire_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {employee.phone}
                            </div>
                          )}
                        </TableCell>
                        {employee.has_compensation_access && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCompensationView(employee.id)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              {viewingCompensation[employee.id] ? 'Hide' : 'View'}
                            </Button>
                          </TableCell>
                        )}
                        {(isSuperAdmin || hasRole('staff')) && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEmployee(employee)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {/* Compensation Details Row */}
                      {viewingCompensation[employee.id] && compensationData[employee.id] && (
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={8}>
                            <div className="p-4 space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Shield className="h-4 w-4 text-red-500" />
                                Sensitive Compensation Data
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Payment Type:</span>
                                  <p>{employee.payment_type}</p>
                                </div>
                                {compensationData[employee.id].hourly_rate && (
                                  <div>
                                    <span className="font-medium">Hourly Rate:</span>
                                    <p>¥{compensationData[employee.id].hourly_rate}/hr</p>
                                  </div>
                                )}
                                {compensationData[employee.id].salary && (
                                  <div>
                                    <span className="font-medium">Annual Salary:</span>
                                    <p>¥{compensationData[employee.id].salary.toLocaleString()}</p>
                                  </div>
                                )}
                                {compensationData[employee.id].emergency_contact_name && (
                                  <div>
                                    <span className="font-medium">Emergency Contact:</span>
                                    <p>{compensationData[employee.id].emergency_contact_name}</p>
                                    {compensationData[employee.id].emergency_contact_phone && (
                                      <p className="text-xs">{compensationData[employee.id].emergency_contact_phone}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecureEmployeeList;