import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  AlertTriangle, 
  Activity, 
  Heart,
  TrendingUp,
  FileDown,
  BarChart3,
  Target,
  Clock
} from 'lucide-react';
import { useHealthAnalyticsReal } from '@/hooks/useHealthAnalyticsReal';
import { useInjuryBreakdown } from '@/hooks/useInjuryBreakdown';
import { InjuryPlayersModal } from './InjuryPlayersModal';
import PlayerDetailsModal from './PlayerDetailsModal';
import InjuryDetailsModal from './InjuryDetailsModal';
import FitnessDetailsModal from './FitnessDetailsModal';
import CheckInDetailsModal from './CheckInDetailsModal';

interface HealthAnalyticsProps {
  userRole: string;
  isSuperAdmin: boolean;
}

export const HealthAnalytics: React.FC<HealthAnalyticsProps> = ({ 
  userRole, 
  isSuperAdmin 
}) => {
  const [timeframe, setTimeframe] = useState('30d');
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [injuryModalOpen, setInjuryModalOpen] = useState(false);
  const [fitnessModalOpen, setFitnessModalOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [injuryPlayersModalOpen, setInjuryPlayersModalOpen] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState<{ location: string; type: string } | null>(null);
  
  // Get timeframe in days
  const timeframeDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  
  const { 
    data: healthData, 
    loading: healthLoading 
  } = useHealthAnalyticsReal(timeframeDays);

  const { 
    data: injuryData, 
    loading: injuryLoading 
  } = useInjuryBreakdown(timeframeDays);

  const loading = healthLoading || injuryLoading;

  const handleInjuryClick = (location: string, type: string) => {
    setSelectedInjury({ location, type });
    setInjuryPlayersModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Health Analytics</h2>
          <p className="text-muted-foreground">Comprehensive health and wellness data analysis</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setPlayerModalOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Players</p>
                <p className="text-3xl font-bold text-primary">{healthData?.totalPlayers || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Active in health system</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setInjuryModalOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Injuries</p>
                <p className="text-3xl font-bold text-destructive">{injuryData?.active_injuries || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">No change from last period</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setFitnessModalOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Fitness Score</p>
                <p className="text-3xl font-bold text-green-600">{healthData?.avgFitnessScore || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">No change from last period</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCheckInModalOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Health Check-ins</p>
                <p className="text-3xl font-bold text-pink-600">{healthData?.checkInCompletionRate || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Daily completion rate</p>
              </div>
              <Heart className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="injury-analysis">Injury Analysis</TabsTrigger>
          <TabsTrigger value="performance-impact">Performance Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Wellness Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Wellness trends chart</p>
                    <p className="text-sm">Real-time data visualization coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Health Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Excellent Health</span>
                    </div>
                    <Badge variant="secondary">65% of players</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">Monitor Closely</span>
                    </div>
                    <Badge variant="secondary">25% of players</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="font-medium">Needs Attention</span>
                    </div>
                    <Badge variant="secondary">10% of players</Badge>
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
                {injuryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {injuryData?.breakdown?.length ? (
                      injuryData.breakdown.map((injury, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleInjuryClick(injury.location, injury.type)}
                        >
                          <div>
                            <p className="font-medium">{injury.type}</p>
                            <p className="text-sm text-gray-600">{injury.count} cases</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold">{injury.percentage}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No injury data available for the selected period</p>
                      </div>
                    )}
                  </div>
                )}
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

      {selectedInjury && (
        <InjuryPlayersModal
          isOpen={injuryPlayersModalOpen}
          onClose={() => {
            setInjuryPlayersModalOpen(false);
            setSelectedInjury(null);
          }}
          injuryLocation={selectedInjury.location}
          injuryType={selectedInjury.type}
          timeframeDays={timeframeDays}
        />
      )}
    </div>
  );
};

export default HealthAnalytics;