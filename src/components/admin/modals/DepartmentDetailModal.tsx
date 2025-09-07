import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building,
  Users, 
  DollarSign, 
  TrendingUp,
  Edit,
  UserPlus,
  BarChart3
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  manager_id: string;
  budget_allocation: number;
  is_active: boolean;
  staff_count: number;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  employment_status: string;
}

interface DepartmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department;
  onEdit: () => void;
}

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  isOpen,
  onClose,
  department,
  onEdit
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [departmentStaff, setDepartmentStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && department) {
      fetchDepartmentStaff();
    }
  }, [isOpen, department]);

  const fetchDepartmentStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, email, employment_status')
        .eq('department', department.name)
        .eq('employment_status', 'active')
        .order('first_name');

      if (error) throw error;
      setDepartmentStaff(data || []);
    } catch (error) {
      console.error('Error fetching department staff:', error);
      toast({
        title: "Error",
        description: "Failed to load department staff",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{department.name}</h2>
                <p className="text-sm text-muted-foreground">{department.description}</p>
              </div>
            </DialogTitle>
            <Button onClick={onEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Department
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff ({department.staff_count})</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{department.staff_count}</div>
                  <p className="text-xs text-muted-foreground">Active employees</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {department.budget_allocation ? formatCurrency(department.budget_allocation) : 'Not set'}
                  </div>
                  <p className="text-xs text-muted-foreground">Annual budget</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={department.is_active ? "default" : "secondary"}>
                    {department.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">Department status</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Department Staff
                  </CardTitle>
                  <Button size="sm" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Staff
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading staff...</div>
                ) : departmentStaff.length > 0 ? (
                  <div className="space-y-3">
                    {departmentStaff.map((staff) => (
                      <div 
                        key={staff.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{staff.first_name} {staff.last_name}</p>
                          <p className="text-sm text-muted-foreground">{staff.position}</p>
                          <p className="text-sm text-muted-foreground">{staff.email}</p>
                        </div>
                        <Badge variant={staff.employment_status === 'active' ? 'default' : 'secondary'}>
                          {staff.employment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No staff assigned to this department</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Annual Budget</label>
                    <p className="text-lg font-semibold">
                      {department.budget_allocation ? formatCurrency(department.budget_allocation) : 'Not allocated'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Budget per Employee</label>
                    <p className="text-lg font-semibold">
                      {department.budget_allocation && department.staff_count > 0 
                        ? formatCurrency(department.budget_allocation / department.staff_count)
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Department Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Department analytics and performance metrics will be displayed here</p>
                  <Button className="mt-4" variant="outline">
                    View Detailed Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};