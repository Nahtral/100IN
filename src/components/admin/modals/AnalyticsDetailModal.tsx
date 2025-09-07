import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building,
  DollarSign,
  Download,
  Filter
} from 'lucide-react';

interface AnalyticsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: 'total_staff' | 'departments' | 'active_staff' | 'avg_per_dept';
  metricTitle: string;
  metricValue: number | string;
}

interface StaffAnalytics {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  employment_status: string;
  hire_date: string;
}

interface DepartmentAnalytics {
  name: string;
  staff_count: number;
  budget_allocation: number;
  is_active: boolean;
}

export const AnalyticsDetailModal: React.FC<AnalyticsDetailModalProps> = ({
  isOpen,
  onClose,
  metricType,
  metricTitle,
  metricValue
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [staffData, setStaffData] = useState<StaffAnalytics[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentAnalytics[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDetailedData();
    }
  }, [isOpen, metricType]);

  const fetchDetailedData = async () => {
    setLoading(true);
    try {
      if (metricType === 'total_staff' || metricType === 'active_staff') {
        const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, department, position, employment_status, hire_date')
          .eq('employment_status', metricType === 'active_staff' ? 'active' : 'active')
          .order('first_name');

        if (error) throw error;
        setStaffData(data || []);
      }

      if (metricType === 'departments' || metricType === 'avg_per_dept') {
        const { data, error } = await supabase
          .from('staff_departments')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        const departmentsWithCount = await Promise.all(
          (data || []).map(async (dept) => {
            const { count } = await supabase
              .from('employees')
              .select('*', { count: 'exact', head: true })
              .eq('department', dept.name)
              .eq('employment_status', 'active');

            return {
              name: dept.name,
              staff_count: count || 0,
              budget_allocation: dept.budget_allocation || 0,
              is_active: dept.is_active
            };
          })
        );

        setDepartmentData(departmentsWithCount);
      }
    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load detailed analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    let csvContent = '';
    let filename = '';

    if (metricType === 'total_staff' || metricType === 'active_staff') {
      csvContent = [
        ['Name', 'Department', 'Position', 'Status', 'Hire Date'],
        ...staffData.map(staff => [
          `${staff.first_name} ${staff.last_name}`,
          staff.department,
          staff.position,
          staff.employment_status,
          new Date(staff.hire_date).toLocaleDateString()
        ])
      ].map(row => row.join(',')).join('\n');
      filename = `${metricType}_analytics.csv`;
    } else {
      csvContent = [
        ['Department', 'Staff Count', 'Budget Allocation', 'Status'],
        ...departmentData.map(dept => [
          dept.name,
          dept.staff_count.toString(),
          dept.budget_allocation.toString(),
          dept.is_active ? 'Active' : 'Inactive'
        ])
      ].map(row => row.join(',')).join('\n');
      filename = 'department_analytics.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Analytics data exported successfully"
    });
  };

  const getIcon = () => {
    switch (metricType) {
      case 'total_staff':
      case 'active_staff':
        return <Users className="h-6 w-6 text-primary" />;
      case 'departments':
        return <Building className="h-6 w-6 text-primary" />;
      case 'avg_per_dept':
        return <BarChart3 className="h-6 w-6 text-primary" />;
      default:
        return <TrendingUp className="h-6 w-6 text-primary" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                {getIcon()}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{metricTitle}</h2>
                <p className="text-sm text-muted-foreground">Detailed analytics and breakdown</p>
              </div>
            </DialogTitle>
            <Button onClick={exportData} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Metric Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-primary mb-2">{metricValue}</div>
                  <p className="text-lg text-muted-foreground">{metricTitle}</p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-semibold">{staffData.length || departmentData.length}</div>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">
                        {metricType === 'departments' ? departmentData.filter(d => d.is_active).length : staffData.filter(s => s.employment_status === 'active').length}
                      </div>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Detailed Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading data...</div>
                ) : (metricType === 'total_staff' || metricType === 'active_staff') ? (
                  <div className="space-y-3">
                    {staffData.map((staff) => (
                      <div 
                        key={staff.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{staff.first_name} {staff.last_name}</p>
                          <p className="text-sm text-muted-foreground">{staff.position} • {staff.department}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={staff.employment_status === 'active' ? 'default' : 'secondary'}>
                            {staff.employment_status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(staff.hire_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {departmentData.map((dept) => (
                      <div 
                        key={dept.name}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{dept.name}</p>
                          <p className="text-sm text-muted-foreground">{dept.staff_count} staff members</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                            {dept.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {dept.budget_allocation > 0 && (
                            <span className="text-sm text-muted-foreground">
                              ${dept.budget_allocation.toLocaleString()} budget
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trends & Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Trend analysis and historical data will be displayed here</p>
                  <Button className="mt-4" variant="outline">
                    View Detailed Trends
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