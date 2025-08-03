import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  Plus,
  Download,
  Eye,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface PayrollDashboardProps {
  onStatsUpdate: () => void;
}

const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      // This would fetch payroll data from the database
      // For now, we'll set loading to false
      setLoading(false);
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payroll data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payroll Dashboard</h2>
          <p className="text-muted-foreground">Manage payroll periods, generate payslips, and track payments</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <div className="flex gap-2">
            <Button className="btn-panthers">
              <Plus className="h-4 w-4 mr-2" />
              New Payroll Period
            </Button>
            <Button variant="outline" className="btn-secondary-panthers">
              <Settings className="h-4 w-4 mr-2" />
              Payroll Settings
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="periods">Pay Periods</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                    <p className="text-2xl font-bold text-primary">$0</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Payslips</p>
                    <p className="text-2xl font-bold text-orange-500">0</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Periods</p>
                    <p className="text-2xl font-bold text-green-500">0</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold text-blue-500">0</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Recent Payroll Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No recent payroll activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No upcoming payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="periods">
          <Card className="card-enhanced">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payroll Periods</CardTitle>
                {(isSuperAdmin || hasRole('staff')) && (
                  <Button className="btn-panthers">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Period
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
                <p className="text-muted-foreground">Create your first payroll period to get started</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips">
          <Card className="card-enhanced">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employee Payslips</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                  {(isSuperAdmin || hasRole('staff')) && (
                    <Button className="btn-panthers">
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Payslips
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payslips generated yet</h3>
                <p className="text-muted-foreground">Generate payslips for your employees to get started</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Payroll Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Monthly Payroll Summary</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comprehensive monthly payroll breakdown
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Tax Summary Report</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tax deductions and contributions
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Employee Earnings</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Individual employee earnings report
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayrollDashboard;