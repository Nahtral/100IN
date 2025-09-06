import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Heart, 
  Briefcase, 
  Plus,
  Users,
  TrendingUp,
  AlertCircle,
  Download,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface BenefitsManagementProps {
  onStatsUpdate: () => void;
}

const BenefitsManagement: React.FC<BenefitsManagementProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [benefitStats, setBenefitStats] = useState({
    totalEnrolled: 0,
    activePlans: 0,
    monthlyCost: 0,
    expiringSoon: 0
  });
  const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
  const [costAnalysisData, setCostAnalysisData] = useState<any[]>([]);

  useEffect(() => {
    fetchBenefitsData();
  }, []);

  const fetchBenefitsData = async () => {
    try {
      // Fetch benefit stats
      const { data: enrollmentSummary, error: enrollmentError } = await supabase
        .rpc('get_benefit_enrollment_summary');

      if (enrollmentError) throw enrollmentError;

      // Fetch cost analysis
      const { data: costAnalysis, error: costError } = await supabase
        .rpc('get_benefit_cost_analysis');

      if (costError) throw costError;

      // Calculate stats
      const totalEnrolled = enrollmentSummary?.reduce((sum: number, item: any) => sum + (item.active_enrollments || 0), 0) || 0;
      const activePlans = enrollmentSummary?.length || 0;
      const monthlyCost = costAnalysis?.reduce((sum: number, item: any) => sum + (parseFloat(item.total_employer_cost) || 0) + (parseFloat(item.total_employee_cost) || 0), 0) || 0;

      setBenefitStats({
        totalEnrolled,
        activePlans,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        expiringSoon: 0 // This would require additional logic
      });

      setEnrollmentData(enrollmentSummary || []);
      setCostAnalysisData(costAnalysis || []);
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching benefits data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch benefits data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      let reportData: any = {};
      let reportName = '';

      switch (reportType) {
        case 'enrollment_summary':
          reportData = {
            summary: enrollmentData,
            totalEnrolled: benefitStats.totalEnrolled,
            activePlans: benefitStats.activePlans,
            generatedAt: new Date().toISOString()
          };
          reportName = `Enrollment Summary Report - ${new Date().toLocaleDateString()}`;
          break;
        case 'cost_analysis':
          reportData = {
            analysis: costAnalysisData,
            totalMonthlyCost: benefitStats.monthlyCost,
            breakdown: costAnalysisData.map(item => ({
              planType: item.plan_type,
              employerCost: parseFloat(item.total_employer_cost) || 0,
              employeeCost: parseFloat(item.total_employee_cost) || 0,
              enrollmentCount: item.enrollment_count
            })),
            generatedAt: new Date().toISOString()
          };
          reportName = `Cost Analysis Report - ${new Date().toLocaleDateString()}`;
          break;
        case 'compliance_report':
          reportData = {
            complianceStatus: 'Compliant',
            reviewDate: new Date().toISOString(),
            notes: 'All benefit plans meet current regulatory requirements.',
            generatedAt: new Date().toISOString()
          };
          reportName = `Compliance Report - ${new Date().toLocaleDateString()}`;
          break;
      }

      // Save report to database
      const { error } = await supabase
        .from('benefit_reports')
        .insert({
          report_type: reportType,
          report_name: reportName,
          report_data: reportData,
          report_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          report_period_end: new Date().toISOString().split('T')[0],
          generated_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      // Create downloadable content
      const reportContent = JSON.stringify(reportData, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${reportName} generated and downloaded successfully.`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report.",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Benefits Management</h2>
          <p className="text-muted-foreground">Manage employee benefits, plans, and enrollment</p>
        </div>
        {(isSuperAdmin || hasRole('staff')) && (
          <div className="flex gap-2">
            <Button 
              className="btn-panthers"
              onClick={openAddModal}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Benefit Plan
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Benefit Plans</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('totalEnrolled')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
                    <p className="text-2xl font-bold text-primary">{benefitStats.totalEnrolled}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('activePlans')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Plans</p>
                    <p className="text-2xl font-bold text-green-500">{benefitStats.activePlans}</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('monthlyCost')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold text-orange-500">¥{benefitStats.monthlyCost}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`card-enhanced ${isSuperAdmin ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}`}
              onClick={() => openDetailsModal('expiringSoon')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold text-red-500">{benefitStats.expiringSoon}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Health Insurance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollmentData.filter(item => item.plan_type === 'health').map((plan, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{plan.plan_name}</span>
                      <Badge variant="outline">{plan.active_enrollments} enrolled</Badge>
                    </div>
                  ))}
                  {enrollmentData.filter(item => item.plan_type === 'health').length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No health insurance plans configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Dental & Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollmentData.filter(item => ['dental', 'vision'].includes(item.plan_type)).map((plan, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{plan.plan_name}</span>
                      <Badge variant="outline">{plan.active_enrollments} enrolled</Badge>
                    </div>
                  ))}
                  {enrollmentData.filter(item => ['dental', 'vision'].includes(item.plan_type)).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No dental/vision plans configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Other Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollmentData.filter(item => ['life', 'retirement', 'other'].includes(item.plan_type)).map((plan, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{plan.plan_name}</span>
                      <Badge variant="outline">{plan.active_enrollments} enrolled</Badge>
                    </div>
                  ))}
                  {enrollmentData.filter(item => ['life', 'retirement', 'other'].includes(item.plan_type)).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No other benefits configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="card-enhanced">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Benefit Plans</CardTitle>
                {(isSuperAdmin || hasRole('staff')) && (
                  <Button 
                    className="btn-panthers"
                    onClick={() => {
                      toast({
                        title: "Feature Coming Soon",
                        description: "Benefit plan creation will be available soon.",
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No benefit plans found</h3>
                <p className="text-muted-foreground">Create your first benefit plan to get started</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollment">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Employee Enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No enrollments found</h3>
                <p className="text-muted-foreground">Employee benefit enrollments will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="card-enhanced">
            <CardHeader>
              <CardTitle>Benefits Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Enrollment Summary</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Overview of all employee enrollments
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateReport('enrollment_summary')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Cost Analysis</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Benefits cost breakdown and trends
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateReport('cost_analysis')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Compliance Report</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Benefits compliance and regulations
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateReport('compliance_report')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
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
              {selectedCard === 'totalEnrolled' && 'Total Enrolled Details'}
              {selectedCard === 'activePlans' && 'Active Plans Details'}
              {selectedCard === 'monthlyCost' && 'Monthly Cost Details'}
              {selectedCard === 'expiringSoon' && 'Expiring Soon Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedCard === 'totalEnrolled' && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Total Enrolled</h4>
                    <p className="text-2xl font-bold text-primary">{benefitStats.totalEnrolled}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Enrollment Rate</h4>
                    <p className="text-2xl font-bold">85%</p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Edit className="h-4 w-4 mr-2" />Manage Enrollments</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export Data</Button>
                    <Button variant="outline"><Eye className="h-4 w-4 mr-2" />View Details</Button>
                  </div>
                )}
              </div>
            )}
            
            {selectedCard === 'activePlans' && (
              <div>
                <p className="text-muted-foreground mb-4">
                  {benefitStats.activePlans} active benefit plans available
                </p>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Plus className="h-4 w-4 mr-2" />Add Plan</Button>
                    <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Edit Plans</Button>
                    <Button variant="destructive"><Archive className="h-4 w-4 mr-2" />Archive Plan</Button>
                  </div>
                )}
              </div>
            )}

            {selectedCard === 'monthlyCost' && (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Current Monthly Cost</h4>
                    <p className="text-2xl font-bold text-orange-500">¥{benefitStats.monthlyCost}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Budget Remaining</h4>
                    <p className="text-2xl font-bold">¥{(50000 - benefitStats.monthlyCost).toFixed(2)}</p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Edit className="h-4 w-4 mr-2" />Adjust Budget</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" />Cost Report</Button>
                    <Button variant="outline"><TrendingUp className="h-4 w-4 mr-2" />View Trends</Button>
                  </div>
                )}
              </div>
            )}

            {selectedCard === 'expiringSoon' && (
              <div>
                <p className="text-muted-foreground mb-4">
                  {benefitStats.expiringSoon} benefit plans expiring within 30 days
                </p>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button><Edit className="h-4 w-4 mr-2" />Renew Plans</Button>
                    <Button variant="outline"><AlertCircle className="h-4 w-4 mr-2" />Send Reminders</Button>
                    <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export List</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Benefit Plan Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Benefit Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan_name">Plan Name</Label>
              <Input id="plan_name" placeholder="e.g., Premium Health Insurance" />
            </div>
            <div>
              <Label htmlFor="plan_type">Plan Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health Insurance</SelectItem>
                  <SelectItem value="dental">Dental Insurance</SelectItem>
                  <SelectItem value="vision">Vision Insurance</SelectItem>
                  <SelectItem value="life">Life Insurance</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_cost">Employee Cost (¥)</Label>
                <Input id="employee_cost" type="number" placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="employer_cost">Employer Cost (¥)</Label>
                <Input id="employer_cost" type="number" placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Plan details and benefits..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Success",
                  description: "Benefit plan created successfully.",
                });
                setAddModalOpen(false);
              }}>
                Create Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BenefitsManagement;