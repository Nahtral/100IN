import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  Plus,
  Download,
  Eye,
  Settings,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import PayrollSettings from './PayrollSettings';

interface PayrollDashboardProps {
  onStatsUpdate: () => void;
}

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: string;
  total_gross_pay: number;
  total_net_pay: number;
}

const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [newPeriod, setNewPeriod] = useState({
    period_name: '',
    start_date: '',
    end_date: '',
    pay_date: '',
    status: 'draft'
  });
  const [payrollStats, setPayrollStats] = useState({
    totalPayroll: 0,
    pendingPayslips: 0,
    activePeriods: 0,
    totalEmployees: 0
  });

  useEffect(() => {
    fetchPayrollData();
    fetchPayrollPeriods();
  }, []);

  const fetchPayrollData = async () => {
    try {
      // Fetch active employees count
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('employment_status', 'active');

      if (empError) throw empError;

      // Fetch approved time off requests for today
      const { data: timeOffRequests, error: timeOffError } = await supabase
        .from('time_off_requests')
        .select('id')
        .eq('status', 'approved')
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (timeOffError) throw timeOffError;

      // Fetch pending payslips
      const { data: pendingPayslips, error: payslipError } = await supabase
        .from('payslips')
        .select('id')
        .eq('status', 'draft');

      if (payslipError) throw payslipError;

      // Calculate total hours for today
      const today = new Date().toISOString().split('T')[0];
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('total_hours')
        .gte('clock_in', `${today}T00:00:00`)
        .lt('clock_in', `${today}T23:59:59`);

      if (timeError) throw timeError;

      const totalHoursToday = timeEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0;

      setPayrollStats({
        totalPayroll: totalHoursToday * 25, // Assuming average ¥25/hour
        pendingPayslips: pendingPayslips?.length || 0,
        activePeriods: timeOffRequests?.length || 0,
        totalEmployees: employees?.length || 0
      });

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

  const fetchPayrollPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayrollPeriods(data || []);
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payroll periods.",
        variant: "destructive",
      });
    }
  };

  const createPayrollPeriod = async () => {
    if (!newPeriod.period_name || !newPeriod.start_date || !newPeriod.end_date || !newPeriod.pay_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert([{
          ...newPeriod,
          created_by: userData.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payroll period created successfully.",
      });

      setNewPeriod({
        period_name: '',
        start_date: '',
        end_date: '',
        pay_date: '',
        status: 'draft'
      });
      setAddModalOpen(false);
      fetchPayrollPeriods();
    } catch (error) {
      console.error('Error creating payroll period:', error);
      toast({
        title: "Error",
        description: "Failed to create payroll period.",
        variant: "destructive",
      });
    }
  };

  const generatePayslipsForPeriod = async (periodId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_payslips_for_period', {
        period_id: periodId
      });

      if (error) throw error;

      const result = data as { success: boolean; payslips_created?: number; period_name?: string; error?: string };

      if (result.success) {
        toast({
          title: "Success",
          description: `Generated ${result.payslips_created} payslips for ${result.period_name}.`,
        });
        fetchPayrollData();
        fetchPayrollPeriods();
      } else {
        throw new Error(result.error || 'Failed to generate payslips');
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
      toast({
        title: "Error",
        description: "Failed to generate payslips.",
        variant: "destructive",
      });
    }
  };

  const openDetailsModal = (cardType: string) => {
    if (!isSuperAdmin) return;
    setSelectedCard(cardType);
    setDetailsModalOpen(true);
  };

  const openAddModal = () => {
    if (!isSuperAdmin) return;
    setAddModalOpen(true);
  };

  const openSettingsModal = () => {
    setSettingsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">¥ Payroll Overview</h2>
          <p className="text-muted-foreground">Manage payroll periods, generate payslips, and track payments</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <div className="flex gap-2">
            <Button 
              className="btn-panthers"
              onClick={openAddModal}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Payroll Period
            </Button>
            <Button 
              variant="outline" 
              className="btn-secondary-panthers"
              onClick={openSettingsModal}
            >
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
            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('totalPayroll')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                    <p className="text-2xl font-bold text-primary">¥{payrollStats.totalPayroll}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('pendingPayslips')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Payslips</p>
                    <p className="text-2xl font-bold text-orange-500">{payrollStats.pendingPayslips}</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('activePeriods')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Periods</p>
                    <p className="text-2xl font-bold text-green-500">{payrollStats.activePeriods}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('totalEmployees')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold text-blue-500">{payrollStats.totalEmployees}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
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
                  <Button 
                    className="btn-panthers"
                    onClick={openAddModal}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Period
                  </Button>
                )}
              </div>
            </CardHeader>
          <CardContent>
            {payrollPeriods.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payroll periods found</h3>
                <p className="text-muted-foreground">Create your first payroll period to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payrollPeriods.map((period) => (
                  <div key={period.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{period.period_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm">Pay Date: {new Date(period.pay_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={period.status === 'active' ? 'default' : 'secondary'}>
                        {period.status}
                      </Badge>
                      {(isSuperAdmin || hasRole('staff')) && period.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => generatePayslipsForPeriod(period.id)}
                        >
                          Generate Payslips
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips">
          <Card className="card-enhanced">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employee Payslips</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Feature Coming Soon",
                        description: "Export functionality will be available soon.",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                  {(isSuperAdmin || hasRole('staff')) && (
                    <Button 
                      className="btn-panthers"
                      onClick={() => {
                        if (payrollPeriods.some(p => p.status === 'active')) {
                          const activePeriod = payrollPeriods.find(p => p.status === 'active');
                          if (activePeriod) {
                            generatePayslipsForPeriod(activePeriod.id);
                          }
                        } else {
                          toast({
                            title: "No Active Period",
                            description: "Create and activate a payroll period first.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Feature Coming Soon",
                        description: "Report generation will be available soon.",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Tax Summary Report</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tax deductions and contributions
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Feature Coming Soon",
                        description: "Report generation will be available soon.",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Employee Earnings</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Individual employee earnings report
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Feature Coming Soon",
                        description: "Report generation will be available soon.",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCard === 'totalPayroll' && 'Total Payroll Details'}
              {selectedCard === 'pendingPayslips' && 'Pending Payslips Details'}
              {selectedCard === 'activePeriods' && 'Active Periods Details'}
              {selectedCard === 'totalEmployees' && 'Total Employees Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedCard === 'totalPayroll' && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Today's Payroll</h4>
                    <p className="text-2xl font-bold text-primary">¥{payrollStats.totalPayroll}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Monthly Target</h4>
                    <p className="text-2xl font-bold">¥500,000</p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Edit className="h-4 w-4 mr-2" />Edit Payroll</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export Report</Button>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Archive</Button>
                  </div>
                )}
              </div>
            )}
            
            {selectedCard === 'pendingPayslips' && (
              <div>
                <p className="text-muted-foreground mb-4">
                  {payrollStats.pendingPayslips} payslips are pending approval
                </p>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Plus className="h-4 w-4 mr-2" />Generate Payslips</Button>
                    <Button variant="outline"><Eye className="h-4 w-4 mr-2" />Review All</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
                  </div>
                )}
              </div>
            )}

            {selectedCard === 'activePeriods' && (
              <div>
                <p className="text-muted-foreground mb-4">
                  {payrollStats.activePeriods} active payroll periods
                </p>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Plus className="h-4 w-4 mr-2" />Create Period</Button>
                    <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Manage Periods</Button>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Close Period</Button>
                  </div>
                )}
              </div>
            )}

            {selectedCard === 'totalEmployees' && (
              <div>
                <p className="text-muted-foreground mb-4">
                  {payrollStats.totalEmployees} active employees in the system
                </p>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
                    <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Manage Employees</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export List</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payroll Period Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Payroll Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="period_name">Period Name</Label>
              <Input 
                id="period_name" 
                placeholder="e.g., January 2024"
                value={newPeriod.period_name}
                onChange={(e) => setNewPeriod({ ...newPeriod, period_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input 
                  id="start_date" 
                  type="date"
                  value={newPeriod.start_date}
                  onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input 
                  id="end_date" 
                  type="date"
                  value={newPeriod.end_date}
                  onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pay_date">Pay Date</Label>
              <Input 
                id="pay_date" 
                type="date"
                value={newPeriod.pay_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, pay_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={newPeriod.status}
                onValueChange={(value) => setNewPeriod({ ...newPeriod, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createPayrollPeriod}>
                Create Period
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payroll Settings</DialogTitle>
          </DialogHeader>
          <PayrollSettings />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollDashboard;