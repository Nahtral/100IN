import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, X, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRequestCache } from '@/hooks/useRequestCache';
import Layout from '@/components/layout/Layout';
import EmployeeForm from '@/components/hr/EmployeeForm';

// Import new modular components
import { TeamGridAccessControl } from '@/components/teamgrid/TeamGridAccessControl';
import { TeamGridHeader } from '@/components/teamgrid/TeamGridHeader';
import { TeamGridTabs } from '@/components/teamgrid/TeamGridTabs';
import { LazyEmployeeSelfService } from '@/components/teamgrid/LazyHRComponents';
import { useTeamGridData } from '@/hooks/useTeamGridData';

const TeamGrid = () => {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const { invalidate } = useRequestCache();
  const { stats, employees, loading, error, refetch } = useTeamGridData();
  
  // UI State - smart default tab based on access level
  const [activeTab, setActiveTab] = useState('timetracking');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);

  // Emergency error fallback
  if (error && !loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-red-600 text-center">Error loading TeamGrid: {error}</p>
            <Button onClick={refetch} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleStatClick = (section: string) => {
    if (section === 'employees-detail') {
      setShowEmployeeModal(true);
    } else {
      setActiveTab(section);
    }
  };

  const handleAddEmployee = () => {
    setActiveTab('employees');
  };

  const exportEmployeeList = useCallback(() => {
    const csvContent = [
      ['Employee ID', 'Name', 'Email', 'Position', 'Department', 'Hire Date', 'Status'],
      ...employees.map(emp => [
        emp.employee_id,
        `${emp.first_name} ${emp.last_name}`,
        emp.email,
        emp.position,
        emp.department || 'N/A',
        new Date(emp.hire_date).toLocaleDateString(),
        emp.employment_status
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
  }, [employees, toast]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const renderContent = (accessLevel: 'super_admin' | 'staff' | 'employee' | 'denied') => {
    if (accessLevel === 'denied') {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access TeamGrid.</p>
          </div>
        </div>
      );
    }

    // Employee/Coach self-service view
    if (accessLevel === 'employee') {
      return <LazyEmployeeSelfService />;
    }

    // Full HR management view for super admins and staff
    return (
      <>
        <TeamGridHeader 
          accessLevel={accessLevel}
          onAddEmployee={handleAddEmployee}
        />

        <TeamGridTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          accessLevel={accessLevel}
          stats={stats}
          employees={employees}
          loading={loading}
          onStatClick={handleStatClick}
          onStatsUpdate={refetch}
          onEmployeeDetailClick={() => setShowEmployeeModal(true)}
        />

        {/* Employee Details Modal */}
        <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Total Employees Details</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowEmployeeModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-muted-foreground">
                {stats.totalEmployees} active employees in the system
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => {
                    setShowAddEmployeeForm(true);
                    setShowEmployeeModal(false);
                  }} 
                  className="btn-panthers"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveTab('employees');
                    setShowEmployeeModal(false);
                  }} 
                  className="btn-secondary-panthers"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Manage Employees
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportEmployeeList} 
                  className="btn-secondary-panthers"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export List
                </Button>
              </div>
              
              {/* Quick employee overview */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Recent Employees</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {employees.slice(0, 5).map(employee => (
                    <div key={employee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                        <p className="text-sm text-muted-foreground">{employee.position} • {employee.department}</p>
                      </div>
                      <Badge variant="secondary">{employee.employment_status}</Badge>
                    </div>
                  ))}
                  {employees.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No employees found</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Employee Form Modal */}
        <Dialog open={showAddEmployeeForm} onOpenChange={setShowAddEmployeeForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <EmployeeForm 
              onSuccess={() => {
                setShowAddEmployeeForm(false);
                invalidate('employees');
                refetch();
                toast({
                  title: "Success",
                  description: "Employee added successfully."
                });
              }} 
              onCancel={() => setShowAddEmployeeForm(false)} 
            />
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="container mx-auto p-6 space-y-6">
        <TeamGridAccessControl>
          {(accessLevel) => renderContent(accessLevel)}
        </TeamGridAccessControl>
      </div>
    </Layout>
  );
};

export default TeamGrid;