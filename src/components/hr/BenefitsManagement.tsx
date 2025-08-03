import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Heart, 
  Briefcase, 
  Plus,
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface BenefitsManagementProps {
  onStatsUpdate: () => void;
}

const BenefitsManagement: React.FC<BenefitsManagementProps> = ({ onStatsUpdate }) => {
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBenefitsData();
  }, []);

  const fetchBenefitsData = async () => {
    try {
      // This would fetch benefits data from the database
      // For now, we'll set loading to false
      setLoading(false);
      onStatsUpdate();
    } catch (error) {
      console.error('Error fetching benefits data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch benefits data.",
        variant: "destructive",
      });
    }
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
            <Button className="btn-panthers">
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
            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
                    <p className="text-2xl font-bold text-primary">0</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Plans</p>
                    <p className="text-2xl font-bold text-green-500">0</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold text-orange-500">$0</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold text-red-500">0</p>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Premium Plan</span>
                    <Badge variant="outline">0 enrolled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Basic Plan</span>
                    <Badge variant="outline">0 enrolled</Badge>
                  </div>
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No health insurance plans configured</p>
                  </div>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Dental Plan</span>
                    <Badge variant="outline">0 enrolled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Vision Plan</span>
                    <Badge variant="outline">0 enrolled</Badge>
                  </div>
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No dental/vision plans configured</p>
                  </div>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm">401(k) Plan</span>
                    <Badge variant="outline">0 enrolled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Life Insurance</span>
                    <Badge variant="outline">0 enrolled</Badge>
                  </div>
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No other benefits configured</p>
                  </div>
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
                  <Button className="btn-panthers">
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
                  <Button variant="outline" size="sm">
                    Generate Report
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Cost Analysis</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Benefits cost breakdown and trends
                  </p>
                  <Button variant="outline" size="sm">
                    Generate Report
                  </Button>
                </Card>

                <Card className="p-4 border border-border">
                  <h4 className="font-semibold mb-2">Compliance Report</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Benefits compliance and regulations
                  </p>
                  <Button variant="outline" size="sm">
                    Generate Report
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

export default BenefitsManagement;