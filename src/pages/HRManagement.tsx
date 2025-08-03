import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  DollarSign, 
  Plus,
  Settings,
  BarChart3,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import EmployeeList from '@/components/hr/EmployeeList';
import TimeTracking from '@/components/hr/TimeTracking';
import TimeOffManagement from '@/components/hr/TimeOffManagement';
import PayrollDashboard from '@/components/hr/PayrollDashboard';
import BenefitsManagement from '@/components/hr/BenefitsManagement';
import OnboardingTasks from '@/components/hr/OnboardingTasks';

const HRManagement = () => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeTimeOff: 0,
    pendingPayslips: 0,
    todaysHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('employment_status', 'active');

      if (empError) throw empError;

      // Fetch active time off requests
      const { data: timeOff, error: timeError } = await supabase
        .from('time_off_requests')
        .select('id')
        .eq('status', 'approved')
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (timeError) throw timeError;

      // Fetch pending payslips
      const { data: payslips, error: payError } = await supabase
        .from('payslips')
        .select('id')
        .eq('status', 'draft');

      if (payError) throw payError;

      // Fetch today's time entries
      const today = new Date().toISOString().split('T')[0];
      const { data: timeEntries, error: timeEntryError } = await supabase
        .from('time_entries')
        .select('total_hours')
        .gte('clock_in', `${today}T00:00:00`)
        .lt('clock_in', `${today}T23:59:59`);

      if (timeEntryError) throw timeEntryError;

      const todaysHours = timeEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0;

      setStats({
        totalEmployees: employees?.length || 0,
        activeTimeOff: timeOff?.length || 0,
        pendingPayslips: payslips?.length || 0,
        todaysHours: Math.round(todaysHours * 100) / 100
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch HR statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className="card-enhanced">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (!hasRole('super_admin') && !hasRole('staff') && !hasRole('coach')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access HR Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">HR Management</h1>
          <p className="text-muted-foreground">Employee, payroll & HR management system</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <div className="flex gap-2">
            <Button onClick={() => setActiveTab('employees')} className="btn-panthers">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
            <Button variant="outline" className="btn-secondary-panthers">
              <Settings className="h-4 w-4 mr-2" />
              HR Settings
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="timetracking">Time Tracking</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-16 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Employees"
                value={stats.totalEmployees}
                icon={Users}
                color="text-primary"
              />
              <StatCard
                title="Active Time Off"
                value={stats.activeTimeOff}
                icon={Calendar}
                color="text-secondary"
              />
              <StatCard
                title="Pending Payslips"
                value={stats.pendingPayslips}
                icon={FileText}
                color="text-orange-500"
              />
              <StatCard
                title="Today's Hours"
                value={stats.todaysHours}
                icon={Clock}
                color="text-green-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>No attendance data available</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payroll Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>No payroll data available</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Recent Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No recent employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle>Recent Time Off Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No recent requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeList onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="timetracking">
          <TimeTracking onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="timeoff">
          <TimeOffManagement onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollDashboard onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="benefits">
          <BenefitsManagement onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingTasks onStatsUpdate={fetchStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRManagement;