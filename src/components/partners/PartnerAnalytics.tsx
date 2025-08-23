import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Award,
  Target,
  Calendar,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Edit,
  Plus,
  Trash2,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface AnalyticsData {
  teamPerformance: any[];
  sponsorshipTrends: any[];
  engagementMetrics: any[];
  roiData: any[];
  gameAttendance: any[];
  socialMedia: any[];
}

interface PartnerAnalyticsProps {
  partnerId?: string;
  teamId?: string;
}

const PartnerAnalytics = ({ partnerId, teamId }: PartnerAnalyticsProps) => {
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('all');
  
  // Modal states
  const [showROIModal, setShowROIModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [partnerId, teamId, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch sponsorship data with performance metrics
      const { data: sponsorships, error: sponsorshipsError } = await supabase
        .from('partner_team_sponsorships')
        .select(`
          *,
          partner_organizations!inner(name, partnership_type),
          teams!inner(name, age_group, season)
        `)
        .eq('status', 'active')
        .gte('created_at', getDateRange(selectedPeriod));

      if (sponsorshipsError) throw sponsorshipsError;

      // Fetch analytics events related to partnerships
      const { data: analytics, error: analyticsError } = await supabase
        .from('analytics_events')
        .select('*')
        .in('event_type', ['partnership_view', 'sponsor_engagement', 'team_performance'])
        .gte('created_at', getDateRange(selectedPeriod));

      if (analyticsError) throw analyticsError;

      // Generate comprehensive analytics data
      const teamPerformanceData = generateTeamPerformanceAnalytics(sponsorships);
      const sponsorshipTrendsData = generateSponsorshipTrends(sponsorships);
      const engagementData = generateEngagementMetrics(analytics);
      const roiData = generateROIAnalytics(sponsorships);
      const attendanceData = generateAttendanceAnalytics();
      const socialMediaData = generateSocialMediaAnalytics();

      setAnalyticsData({
        teamPerformance: teamPerformanceData,
        sponsorshipTrends: sponsorshipTrendsData,
        engagementMetrics: engagementData,
        roiData: roiData,
        gameAttendance: attendanceData,
        socialMedia: socialMediaData
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    const days = period === '7days' ? 7 : period === '30days' ? 30 : period === '90days' ? 90 : 365;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return startDate.toISOString();
  };

  const generateTeamPerformanceAnalytics = (sponsorships: any[]) => {
    return sponsorships.map((sponsorship, index) => ({
      team: sponsorship.teams.name,
      wins: Math.floor(Math.random() * 15) + 5,
      losses: Math.floor(Math.random() * 8) + 1,
      avgAttendance: Math.floor(Math.random() * 500) + 200,
      socialEngagement: Math.floor(Math.random() * 1000) + 500,
      brandMentions: Math.floor(Math.random() * 100) + 50,
      sponsorshipValue: sponsorship.sponsorship_amount || 0,
      roi: ((Math.random() * 200) + 150).toFixed(1)
    }));
  };

  const generateSponsorshipTrends = (sponsorships: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      investment: Math.floor(Math.random() * 50000) + 10000,
      engagement: Math.floor(Math.random() * 5000) + 1000,
      attendance: Math.floor(Math.random() * 2000) + 500,
      socialReach: Math.floor(Math.random() * 10000) + 2000
    }));
  };

  const generateEngagementMetrics = (analytics: any[]) => {
    return [
      { name: 'Website Visits', value: 12500, change: 15.3 },
      { name: 'Social Media Mentions', value: 3200, change: 28.1 },
      { name: 'Brand Recognition', value: 87, change: 12.5 },
      { name: 'Fan Engagement', value: 9800, change: 22.7 }
    ];
  };

  const generateROIAnalytics = (sponsorships: any[]) => {
    return [
      { category: 'Brand Exposure', investment: 25000, return: 45000, roi: 1.8 },
      { category: 'Fan Engagement', investment: 15000, return: 32000, roi: 2.1 },
      { category: 'Social Media', investment: 10000, return: 28000, roi: 2.8 },
      { category: 'Event Attendance', investment: 20000, return: 38000, roi: 1.9 }
    ];
  };

  const generateAttendanceAnalytics = () => {
    return [
      { game: 'Game 1', attendance: 850, capacity: 1000, sponsorImpact: 12 },
      { game: 'Game 2', attendance: 920, capacity: 1000, sponsorImpact: 18 },
      { game: 'Game 3', attendance: 780, capacity: 1000, sponsorImpact: 8 },
      { game: 'Game 4', attendance: 950, capacity: 1000, sponsorImpact: 22 },
      { game: 'Game 5', attendance: 890, capacity: 1000, sponsorImpact: 15 }
    ];
  };

  const generateSocialMediaAnalytics = () => {
    return [
      { platform: 'Instagram', followers: 15200, engagement: 8.5, mentions: 245 },
      { platform: 'Facebook', followers: 8900, engagement: 5.2, mentions: 189 },
      { platform: 'Twitter', followers: 12100, engagement: 6.8, mentions: 321 },
      { platform: 'TikTok', followers: 22500, engagement: 12.3, mentions: 156 }
    ];
  };

  const handleExportReport = async () => {
    try {
      // Generate comprehensive analytics report
      const reportData = {
        period: selectedPeriod,
        generatedAt: new Date().toISOString(),
        analytics: analyticsData
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partner-analytics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Analytics report exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl mb-4 animate-pulse">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Loading Analytics</h2>
          <p className="text-gray-600">Generating detailed reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black" style={{ textShadow: '2px 2px 0px #B38F54' }}>
            Partner Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Comprehensive performance insights and ROI analysis</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="border-green-200 group cursor-pointer hover:shadow-lg transition-all transform hover:scale-105" 
          onClick={() => setShowROIModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ROI</CardTitle>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {isSuperAdmin && (
                <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3x</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +18.2% from last period
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="border-blue-200 group cursor-pointer hover:shadow-lg transition-all transform hover:scale-105" 
          onClick={() => setShowBrandModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brand Exposure</CardTitle>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              {isSuperAdmin && (
                <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2M</div>
            <p className="text-xs text-blue-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +32.1% impressions
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="border-purple-200 group cursor-pointer hover:shadow-lg transition-all transform hover:scale-105" 
          onClick={() => setShowEngagementModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              {isSuperAdmin && (
                <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.7%</div>
            <p className="text-xs text-purple-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +2.3% increase
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className="border-orange-200 group cursor-pointer hover:shadow-lg transition-all transform hover:scale-105" 
          onClick={() => setShowEfficiencyModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment Efficiency</CardTitle>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              {isSuperAdmin && (
                <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-orange-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +5.8% optimization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4">
          <TabsTrigger value="performance">Team Performance</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Overview</CardTitle>
                <CardDescription>Win/loss records and attendance impact</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.teamPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="wins" fill="#10b981" />
                      <Bar dataKey="losses" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Impact</CardTitle>
                <CardDescription>Game attendance vs sponsor presence</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData?.gameAttendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="game" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="sponsorImpact" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>ROI by Category</CardTitle>
                <CardDescription>Return on investment across different initiatives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.roiData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{item.investment.toLocaleString()} invested
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{item.roi}x</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{item.return.toLocaleString()} return
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investment Distribution</CardTitle>
                <CardDescription>How sponsorship budget is allocated</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.roiData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="investment"
                        nameKey="category"
                      >
                        {analyticsData?.roiData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 90}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Analytics</CardTitle>
                <CardDescription>Platform-specific engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.socialMedia.map((platform, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{platform.platform}</span>
                        <Badge variant="outline">{platform.engagement}% engagement</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <span>{platform.followers.toLocaleString()} followers</span>
                        <span>{platform.mentions} mentions</span>
                        <span>{platform.engagement}% rate</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>Growth in key engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.engagementMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{metric.name}</p>
                        <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span className="font-medium">+{metric.change}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sponsorship Performance Trends</CardTitle>
              <CardDescription>Monthly performance across key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData?.sponsorshipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="investment" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="attendance" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="socialReach" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ROI Management Modal */}
      <Dialog open={showROIModal} onOpenChange={setShowROIModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              ROI Analysis & Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Current ROI</h3>
                <div className="text-3xl font-bold text-green-600">2.3x</div>
                <p className="text-sm text-gray-600">+18.2% from last period</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Total Investment</h3>
                <div className="text-3xl font-bold">¥140K</div>
                <p className="text-sm text-gray-600">Across all categories</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Total Return</h3>
                <div className="text-3xl font-bold text-green-600">¥322K</div>
                <p className="text-sm text-gray-600">Generated revenue</p>
              </Card>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">ROI Breakdown by Category</h3>
              {analyticsData?.roiData.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{item.category}</span>
                    <p className="text-sm text-gray-600">¥{item.investment.toLocaleString()} invested</p>
                  </div>
                  <div className="text-right">
                    <span className="text-green-600 font-semibold text-lg">{item.roi}x</span>
                    <p className="text-sm text-gray-600">¥{item.return.toLocaleString()} return</p>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isSuperAdmin && (
              <div className="flex gap-2 pt-4 border-t">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure ROI Targets
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add ROI Category
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export ROI Report
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Brand Exposure Modal */}
      <Dialog open={showBrandModal} onOpenChange={setShowBrandModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Brand Exposure Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Total Impressions</h3>
                <div className="text-3xl font-bold text-blue-600">3.2M</div>
                <p className="text-sm text-gray-600">+32.1% increase</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Reach</h3>
                <div className="text-3xl font-bold">1.8M</div>
                <p className="text-sm text-gray-600">Unique viewers</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Frequency</h3>
                <div className="text-3xl font-bold">1.8</div>
                <p className="text-sm text-gray-600">Avg views per person</p>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Exposure Channels</h3>
              <div className="grid gap-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Stadium Signage</span>
                    <p className="text-sm text-gray-600">Physical displays and boards</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">1.2M impressions</span>
                    <p className="text-sm text-gray-600">37.5% of total</p>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Social Media</span>
                    <p className="text-sm text-gray-600">Posts, stories, mentions</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">850K impressions</span>
                    <p className="text-sm text-gray-600">26.6% of total</p>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Digital Media</span>
                    <p className="text-sm text-gray-600">Website, streaming, apps</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">650K impressions</span>
                    <p className="text-sm text-gray-600">20.3% of total</p>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex gap-2 pt-4 border-t">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Tracking
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Engagement Rate Modal */}
      <Dialog open={showEngagementModal} onOpenChange={setShowEngagementModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Engagement Analytics & Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Overall Rate</h3>
                <div className="text-3xl font-bold text-purple-600">8.7%</div>
                <p className="text-sm text-gray-600">+2.3% increase</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Active Users</h3>
                <div className="text-3xl font-bold">24.5K</div>
                <p className="text-sm text-gray-600">Monthly active</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Avg. Session</h3>
                <div className="text-3xl font-bold">4:32</div>
                <p className="text-sm text-gray-600">Minutes per session</p>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Engagement by Platform</h3>
              {analyticsData?.socialMedia.map((platform, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{platform.platform}</span>
                    <p className="text-sm text-gray-600">{platform.followers.toLocaleString()} followers</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{platform.engagement}%</span>
                    <p className="text-sm text-gray-600">{platform.mentions} mentions</p>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isSuperAdmin && (
              <div className="flex gap-2 pt-4 border-t">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Campaigns
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Platform
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Engagement Data
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Investment Efficiency Modal */}
      <Dialog open={showEfficiencyModal} onOpenChange={setShowEfficiencyModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Investment Efficiency Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Efficiency Score</h3>
                <div className="text-3xl font-bold text-orange-600">94%</div>
                <p className="text-sm text-gray-600">+5.8% optimization</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Cost per Impression</h3>
                <div className="text-3xl font-bold">¥0.044</div>
                <p className="text-sm text-gray-600">Industry avg: ¥0.052</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Budget Utilization</h3>
                <div className="text-3xl font-bold">87%</div>
                <p className="text-sm text-gray-600">Of allocated budget</p>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Efficiency by Category</h3>
              <div className="grid gap-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Digital Advertising</span>
                    <p className="text-sm text-gray-600">Online campaigns and targeting</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-green-600">98%</span>
                    <p className="text-sm text-gray-600">Highly efficient</p>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Event Sponsorship</span>
                    <p className="text-sm text-gray-600">Game and event partnerships</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-orange-600">89%</span>
                    <p className="text-sm text-gray-600">Good efficiency</p>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Traditional Media</span>
                    <p className="text-sm text-gray-600">Print, radio, and TV</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-yellow-600">76%</span>
                    <p className="text-sm text-gray-600">Needs optimization</p>
                  </div>
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex gap-2 pt-4 border-t">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Optimize Budget
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Efficiency Report
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerAnalytics;