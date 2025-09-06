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
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import EmployeeForm from './EmployeeForm';

interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  position: string;
  hire_date: string;
  employment_status: string;
  payment_type: string;
  role: string;
  role_active: boolean;
  role_display: string;
  approval_status: string;
  created_at?: string;
  updated_at?: string;
  has_compensation_access?: boolean;
  // Sensitive fields only available to authorized users
  hourly_rate?: number;
  salary?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface EmployeeListProps {
  onStatsUpdate: () => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Use secure function that masks sensitive data based on user role
      const { data, error } = await supabase
        .rpc('get_employees_secure');

      if (error) throw error;
      setEmployees(data || []);
      onStatsUpdate();
      
      // Log the access for audit purposes
      if (data && data.length > 0) {
        await supabase.rpc('log_employee_access', {
          accessed_employee_id: null, // bulk access
          access_type: 'list_view',
          includes_sensitive_data: false
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees. You may not have permission to view this data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditEmployee = async (employee: Employee) => {
    // Load sensitive data if user has access and is editing
    if (employee.has_compensation_access) {
      try {
        const { data, error } = await supabase
          .rpc('get_employee_compensation_secure', { employee_uuid: employee.id });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const compensation = data[0];
          const fullEmployee = {
            ...employee,
            hourly_rate: compensation.hourly_rate,
            salary: compensation.salary,
            emergency_contact_name: compensation.emergency_contact_name,
            emergency_contact_phone: compensation.emergency_contact_phone
          };
          setEditingEmployee(fullEmployee);
          
          // Log sensitive data access
          await supabase.rpc('log_employee_access', {
            accessed_employee_id: employee.id,
            access_type: 'edit_form',
            includes_sensitive_data: true
          });
        }
      } catch (error) {
        console.error('Error loading employee compensation:', error);
        toast({
          title: "Warning",
          description: "Could not load sensitive employee data.",
          variant: "destructive",
        });
        setEditingEmployee(employee);
      }
    } else {
      setEditingEmployee(employee);
    }
    
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
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
        description: "Failed to delete employee.",
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
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      terminated: 'bg-gray-100 text-gray-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employees</h2>
          <p className="text-muted-foreground">Manage employee information and records</p>
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
            <CardTitle>Employee Directory</CardTitle>
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
                  {(isSuperAdmin || hasRole('staff')) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
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
                    {(isSuperAdmin || hasRole('staff')) && (
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleEditEmployee(employee)}
                             title="Edit employee"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           {isSuperAdmin && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleDeleteEmployee(employee.id)}
                               className="text-destructive hover:text-destructive"
                               title="Delete employee (Super Admin only)"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
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
    </div>
  );
};

export default EmployeeList;