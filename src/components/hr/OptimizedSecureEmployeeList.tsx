import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Edit, Trash2, Eye, Download, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useRequestCache } from '@/hooks/useRequestCache';
import EmployeeForm from './EmployeeForm';

interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hire_date: string;
  employment_status: string;
  salary?: number;
  hourly_rate?: number;
  payment_type: string;
}

interface OptimizedSecureEmployeeListProps {
  onStatsUpdate?: () => void;
}

const OptimizedSecureEmployeeList = ({ onStatsUpdate }: OptimizedSecureEmployeeListProps) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const { fetchWithCache, invalidate } = useRequestCache<Employee[]>();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithCache({
        table: 'employees',
        select: '*',
        cacheKey: 'all_employees',
        ttl: 5 * 60 * 1000 // 5 minutes
      });
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [fetchWithCache, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Memoized filtered employees for better performance
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || employee.employment_status === statusFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  // Memoized departments list
  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
    return depts.sort();
  }, [employees]);

  const handleSuccess = useCallback(() => {
    invalidate('employees');
    fetchEmployees();
    onStatsUpdate?.();
    setShowAddForm(false);
    setShowEditForm(false);
    setSelectedEmployee(null);
  }, [invalidate, fetchEmployees, onStatsUpdate]);

  const exportToCSV = useCallback(() => {
    const csvContent = [
      ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Position', 'Status', 'Hire Date'],
      ...filteredEmployees.map(emp => [
        emp.employee_id,
        `${emp.first_name} ${emp.last_name}`,
        emp.email,
        emp.phone || '',
        emp.department || '',
        emp.position || '',
        emp.employment_status,
        new Date(emp.hire_date).toLocaleDateString()
      ])
    ];
    
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Employee list exported successfully."
    });
  }, [filteredEmployees, toast]);

  // Memoized employee card component
  const EmployeeCard = useMemo(() => React.memo(({ employee }: { employee: Employee }) => (
    <Card className="card-enhanced hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{employee.first_name} {employee.last_name}</h3>
              <Badge 
                variant={employee.employment_status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {employee.employment_status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{employee.email}</p>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
            <p className="text-sm text-muted-foreground">{employee.department}</p>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEmployee(employee);
                setShowViewModal(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {(isSuperAdmin || hasRole('staff')) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedEmployee(employee);
                  setShowEditForm(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )), [isSuperAdmin, hasRole]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Management</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {(isSuperAdmin || hasRole('staff')) && (
                <Button onClick={() => setShowAddForm(true)} className="btn-panthers">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
            
            <div className="flex items-center text-sm text-muted-foreground">
              {filteredEmployees.length} of {employees.length} employees
            </div>
          </div>
          
          {/* Employee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map(employee => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No employees found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSuccess={handleSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={selectedEmployee}
            onSuccess={handleSuccess}
            onCancel={() => {
              setShowEditForm(false);
              setSelectedEmployee(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Employee Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Employee ID</label>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.employee_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedEmployee.employment_status === 'active' ? 'default' : 'secondary'}>
                    {selectedEmployee.employment_status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Position</label>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Hire Date</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OptimizedSecureEmployeeList;