import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  AlertTriangle,
  Users,
  Calendar,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PlayerDetailsModal from './PlayerDetailsModal';
import InjuryDetailsModal from './InjuryDetailsModal';
import FitnessDetailsModal from './FitnessDetailsModal';
import CheckInDetailsModal from './CheckInDetailsModal';

interface HealthAnalyticsProps {
  userRole: string;
  isSuperAdmin: boolean;
}

const HealthAnalytics: React.FC<HealthAnalyticsProps> = ({ 
  userRole, 
  isSuperAdmin 
}) => {
  const [analyticsData, setAnalyticsData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  
  // Modal states
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [injuryModalOpen, setInjuryModalOpen] = useState(false);
  const [fitnessModalOpen, setFitnessModalOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch comprehensive health analytics
      const { data: healthRecords } = await supabase
        .from('health_wellness')
        .select('*')
        .order('date', { ascending: false });

      const records = healthRecords || [];
      
      // Calculate analytics
      const totalPlayers = new Set(records.map(r => r.player_id)).size;
      const activeInjuries = records.filter(r => r.injury_status === 'injured').length;
      const avgFitness = records.length > 0 
        ? Math.round(records.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / records.length)
        : 0;
      
      // Injury trends
      const injuryTrends = calculateInjuryTrends(records);
      const fitnesstrends = calculateFitnessTrends(records);
      
      setAnalyticsData({
        totalPlayers,
        activeInjuries,
        avgFitness,
        injuryTrends,
        fitnesstrends,
        records
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInjuryTrends = (records: any[]) => {
    // Group by month and count injuries
    const monthlyInjuries: { [key: string]: number } = {};
    
    records.forEach(record => {
      if (record.injury_status === 'injured') {
        const month = new Date(record.date).toISOString().slice(0, 7);
        monthlyInjuries[month] = (monthlyInjuries[month] || 0) + 1;
      }
    });
    
    return Object.entries(monthlyInjuries)
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .slice(-6); // Last 6 months
  };

  const calculateFitnessTrends = (records: any[]) => {
    // Calculate average fitness by month
    const monthlyFitness: { [key: string]: { total: number; count: number } } = {};
    
    records.forEach(record => {
      if (record.fitness_score) {
        const month = new Date(record.date).toISOString().slice(0, 7);
        if (!monthlyFitness[month]) {
          monthlyFitness[month] = { total: 0, count: 0 };
        }
        monthlyFitness[month].total += record.fitness_score;
        monthlyFitness[month].count += 1;
      }
    });
    
    return Object.entries(monthlyFitness)
      .map(([month, data]) => [month, Math.round(data.total / data.count)])
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .slice(-6); // Last 6 months
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Health Analytics</h2>
          <p className="text-gray-600">Comprehensive health and wellness data analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="border-blue-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-300"
          onClick={() => setPlayerModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active in health system
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-red-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-red-300"
          onClick={() => setInjuryModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Injuries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeInjuries || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 inline mr-1 text-green-500" />
              12% decrease from last month
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-green-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-green-300"
          onClick={() => setFitnessModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fitness Score</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgFitness || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1 text-green-500" />
              5% improvement this month
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-orange-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-orange-300"
          onClick={() => setCheckInModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Check-ins</CardTitle>
            <Heart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">
              Daily completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="injury-analysis">Injury Analysis</TabsTrigger>
          <TabsTrigger value="performance-impact">Performance Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wellness Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Wellness Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Wellness trend visualization</p>
                    <p className="text-sm">Data visualization component would go here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Health Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Overall Health Score</p>
                    <p className="text-sm text-gray-600">Team average</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">85</div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Excellent
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Injury Risk Level</p>
                    <p className="text-sm text-gray-600">Current assessment</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">Low</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Recovery Rate</p>
                    <p className="text-sm text-gray-600">Average time to return</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">12 days</div>
                    <p className="text-xs text-gray-500">20% faster than league avg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="injury-analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Injury Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'Ankle Sprains', count: 8, percentage: 35 },
                    { type: 'Knee Injuries', count: 5, percentage: 22 },
                    { type: 'Shoulder Injuries', count: 4, percentage: 17 },
                    { type: 'Back Injuries', count: 3, percentage: 13 },
                    { type: 'Other', count: 3, percentage: 13 }
                  ].map((injury, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{injury.type}</p>
                        <p className="text-sm text-gray-600">{injury.count} cases</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold">{injury.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prevention Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-1">Recommendation</h4>
                    <p className="text-sm text-blue-700">
                      Increase ankle strengthening exercises to reduce sprain risk by 30%
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-1">Success Story</h4>
                    <p className="text-sm text-green-700">
                      Recovery time improved by 25% with new rehabilitation protocol
                    </p>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-1">Alert</h4>
                    <p className="text-sm text-yellow-700">
                      Higher injury rate during Tuesday practices - consider workload adjustment
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance-impact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Correlation</CardTitle>
              <p className="text-sm text-muted-foreground">
                How health metrics correlate with performance outcomes
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Performance correlation analysis</p>
                  <p className="text-sm">Advanced analytics dashboard coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PlayerDetailsModal
        isOpen={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <InjuryDetailsModal
        isOpen={injuryModalOpen}
        onClose={() => setInjuryModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <FitnessDetailsModal
        isOpen={fitnessModalOpen}
        onClose={() => setFitnessModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
      
      <CheckInDetailsModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};

export default HealthAnalytics;