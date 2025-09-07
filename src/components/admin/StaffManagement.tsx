import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StaffDetailModal } from './modals/StaffDetailModal';
import { StaffEditModal } from './modals/StaffEditModal';
import { CreateStaffModal } from './modals/CreateStaffModal';
import { DepartmentDetailModal } from './modals/DepartmentDetailModal';
import { DepartmentEditModal } from './modals/DepartmentEditModal';
import { CreateDepartmentModal } from './modals/CreateDepartmentModal';
import { AnalyticsDetailModal } from './modals/AnalyticsDetailModal';
import { 
  UserPlus, 
  Users, 
  Calendar, 
  Shield, 
  BriefcaseMedical, 
  DollarSign,
  Clock,
  Eye,
  Edit,
  Building,
  Plus,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employment_status: string;
  hire_date: string;
  payment_type: string;
  hourly_rate?: number;
  salary?: number;
  has_compensation_access: boolean;
}

interface Department {
  id: string;
  name: string;
  description: string;
  manager_id: string;
  budget_allocation: number;
  is_active: boolean;
  staff_count: number;
}

export const StaffManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('staff');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Department modals
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showDepartmentDetailModal, setShowDepartmentDetailModal] = useState(false);
  const [showDepartmentEditModal, setShowDepartmentEditModal] = useState(false);
  const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
  
  // Analytics modals
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsMetric, setAnalyticsMetric] = useState<{
    type: 'total_staff' | 'departments' | 'active_staff' | 'avg_per_dept';
    title: string;
    value: number | string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStaffMembers(),
        fetchDepartments(),
        fetchAnalytics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_id,
          first_name,
          last_name,
          email,
          phone,
          department,
          position,
          employment_status,
          hire_date,
          payment_type,
          created_at,
          updated_at
        `)
        .eq('employment_status', 'active')
        .order('first_name');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      const staffWithAccess = data?.map(staff => ({
        ...staff,
        payment_type: staff.payment_type || 'hourly',
        has_compensation_access: true // Super admin has access to compensation data
      })) || [];
      
      setStaffMembers(staffWithAccess);
      
      toast({
        title: "Staff Data Loaded",
        description: `Successfully loaded ${staffWithAccess.length} staff members`,
      });
      
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast({
        title: "Error",
        description: "Failed to load staff data. Please check your permissions.",
        variant: "destructive",
      });
      setStaffMembers([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get staff count for each department
      const departmentsWithCount = await Promise.all(
        (data || []).map(async (dept) => {
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('department', dept.name)
            .eq('employment_status', 'active');

          return {
            ...dept,
            staff_count: count || 0
          };
        })
      );

      setDepartments(departmentsWithCount);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    }
  };

  const fetchAnalytics = async () => {
    try {
      // For now, calculate analytics from local data until RPC is available
      const totalStaff = staffMembers.length;
      const activeDepartments = departments.length;
      const departmentDistribution = departments.map(dept => ({
        department: dept.name,
        count: dept.staff_count,
        budget: dept.budget_allocation
      }));

      setAnalytics({
        total_staff: totalStaff,
        active_staff: staffMembers.filter(s => s.employment_status === 'active').length,
        total_departments: activeDepartments,
        avg_staff_per_department: activeDepartments > 0 ? Math.round(totalStaff / activeDepartments) : 0,
        department_distribution: departmentDistribution
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  const handleStaffClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowDetailModal(true);
  };

  const handleEditClick = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowEditModal(true);
  };

  const handleStaffUpdate = (updatedStaff: StaffMember) => {
    setStaffMembers(prev => prev.map(staff => 
      staff.id === updatedStaff.id ? updatedStaff : staff
    ));
  };

  const handleCreateSuccess = () => {
    fetchData();
  };

  // Department handlers
  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
    setShowDepartmentDetailModal(true);
  };

  const handleDepartmentEdit = (department: Department) => {
    setSelectedDepartment(department);
    setShowDepartmentEditModal(true);
  };

  const handleDepartmentUpdate = (updatedDepartment: Department) => {
    setDepartments(prev => prev.map(dept => 
      dept.id === updatedDepartment.id ? updatedDepartment : dept
    ));
  };

  // Analytics handlers
  const handleAnalyticsClick = (type: 'total_staff' | 'departments' | 'active_staff' | 'avg_per_dept', title: string, value: number | string) => {
    setAnalyticsMetric({ type, title, value });
    setShowAnalyticsModal(true);
  };

  const navigateToHRSection = (section: string) => {
    navigate(`/admin/staff/hr/${section}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700';
      case 'inactive':
        return 'bg-red-50 text-red-700';
      case 'on_leave':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const filteredStaff = staffMembers.filter(staff => 
    `${staff.first_name} ${staff.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedStaff = filteredStaff.reduce((acc, staff) => {
    if (!acc[staff.department]) {
      acc[staff.department] = [];
    }
    acc[staff.department].push(staff);
    return acc;
  }, {} as Record<string, StaffMember[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <UserPlus className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading staff management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mobile-subtitle">Staff Management</h2>
          <p className="text-muted-foreground mobile-text-sm">
            Manage administrative staff, HR, and organizational personnel
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {staffMembers.length} Staff Members
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {departments.length} Departments
          </Badge>
        </div>
      </div>

      {/* Staff Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Directory
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="hr" className="flex items-center gap-2">
            <BriefcaseMedical className="h-4 w-4" />
            HR Functions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Staff Directory Tab */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Staff Directory
                </CardTitle>
                <Button onClick={() => setShowCreateModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </div>
              <Input
                placeholder="Search staff by name, email, department, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </CardHeader>
            <CardContent>
              {Object.entries(groupedStaff).map(([department, departmentStaff]) => (
                <div key={department} className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {department}
                    <Badge variant="secondary">{departmentStaff.length} members</Badge>
                  </h3>
                  <div className="space-y-3">
                    {departmentStaff.map((staff) => (
                      <div 
                        key={staff.id} 
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleStaffClick(staff)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{staff.first_name} {staff.last_name}</p>
                            <p className="text-sm text-muted-foreground">{staff.position}</p>
                            <p className="text-sm text-muted-foreground">{staff.email}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                ID: {staff.employee_id}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${getStatusBadgeColor(staff.employment_status)}`}>
                                {staff.employment_status}
                              </Badge>
                              {staff.has_compensation_access && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStaffClick(staff);
                                  }}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Compensation Data
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStaffClick(staff);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(staff);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({
                                title: "Schedule Management",
                                description: `Managing schedule for ${staff.first_name} ${staff.last_name}`,
                              });
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredStaff.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-50" />
                  <p>No staff members found matching your search</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-600" />
                  Department Management
                </CardTitle>
                <Button onClick={() => setShowCreateDepartmentModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {departments.map((dept) => (
                  <div 
                    key={dept.id} 
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleDepartmentClick(dept)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground">{dept.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {dept.staff_count} Staff
                        </Badge>
                        {dept.budget_allocation && (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            ${dept.budget_allocation.toLocaleString()} Budget
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDepartmentClick(dept);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDepartmentEdit(dept);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HR Functions Tab */}
        <TabsContent value="hr" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Time & Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage employee time tracking and attendance
                </p>
                <Button className="w-full" size="sm">
                  Open Time Tracking
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  Leave Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Handle time off requests and leave policies
                </p>
                <Button className="w-full" size="sm">
                  Manage Leave
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  Payroll
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Process payroll and manage compensation
                </p>
                <Button className="w-full" size="sm">
                  Payroll Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BriefcaseMedical className="h-4 w-4" />
                  Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage employee benefits and enrollment
                </p>
                <Button className="w-full" size="sm">
                  Benefits Admin
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage staff roles and access control
                </p>
                <Button className="w-full" size="sm">
                  Staff Permissions
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4" />
                  Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  New employee onboarding tasks
                </p>
                <Button className="w-full" size="sm">
                  Onboarding Tasks
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAnalyticsClick('total_staff', 'Total Staff', staffMembers.length)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{staffMembers.length}</div>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAnalyticsClick('departments', 'Departments', departments.length)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{departments.length}</div>
                <p className="text-xs text-muted-foreground">Active departments</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAnalyticsClick('active_staff', 'Active Staff', staffMembers.filter(s => s.employment_status === 'active').length)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {staffMembers.filter(s => s.employment_status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">Currently working</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleAnalyticsClick('avg_per_dept', 'Average per Department', departments.length > 0 ? Math.round(staffMembers.length / departments.length) : 0)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avg per Dept</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {departments.length > 0 ? Math.round(staffMembers.length / departments.length) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Staff per department</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.max(10, (dept.staff_count / Math.max(1, Math.max(...departments.map(d => d.staff_count)))) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {dept.staff_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Staff Modals */}
      {selectedStaff && (
        <StaffDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          staff={selectedStaff}
          onEdit={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {selectedStaff && (
        <StaffEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          staff={selectedStaff}
          onSave={handleStaffUpdate}
        />
      )}

      <CreateStaffModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Department Modals */}
      {selectedDepartment && (
        <DepartmentDetailModal
          isOpen={showDepartmentDetailModal}
          onClose={() => setShowDepartmentDetailModal(false)}
          department={selectedDepartment}
          onEdit={() => {
            setShowDepartmentDetailModal(false);
            setShowDepartmentEditModal(true);
          }}
        />
      )}

      {selectedDepartment && (
        <DepartmentEditModal
          isOpen={showDepartmentEditModal}
          onClose={() => setShowDepartmentEditModal(false)}
          department={selectedDepartment}
          onSave={handleDepartmentUpdate}
        />
      )}

      <CreateDepartmentModal
        isOpen={showCreateDepartmentModal}
        onClose={() => setShowCreateDepartmentModal(false)}
        onSuccess={fetchData}
      />

      {/* Analytics Modal */}
      {analyticsMetric && (
        <AnalyticsDetailModal
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          metricType={analyticsMetric.type}
          metricTitle={analyticsMetric.title}
          metricValue={analyticsMetric.value}
        />
      )}
    </div>
  );
};