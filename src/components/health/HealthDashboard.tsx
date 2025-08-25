import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Moon,
  Zap,
  Shield,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EmergencyAlertModal from './EmergencyAlertModal';
import AIHealthAnalysisModal from './AIHealthAnalysisModal';

interface HealthDashboardProps {
  userRole: string;
  isSuperAdmin: boolean;
  playerProfile?: any;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ 
  userRole, 
  isSuperAdmin, 
  playerProfile 
}) => {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<any>({
    sleepQuality: 0,
    energyLevel: 0,
    totalInjuries: 0,
    checkinStreak: 0
  });
  const [loading, setLoading] = useState(true);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);

  useEffect(() => {
    fetchHealthOverview();
  }, [userRole, playerProfile]);

  const fetchHealthOverview = async () => {
    try {
      if (userRole === 'player' && playerProfile) {
        // Fetch player-specific health data
        const { data: healthRecords } = await supabase
          .from('health_wellness')
          .select('*')
          .eq('player_id', playerProfile.id)
          .order('date', { ascending: false })
          .limit(30);

        // Calculate averages and stats
        const recentRecords = healthRecords || [];
        const avgFitness = recentRecords.length > 0 
          ? recentRecords.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / recentRecords.length 
          : 0;

        setHealthData({
          sleepQuality: Math.floor(Math.random() * 10), // Placeholder
          energyLevel: Math.floor(Math.random() * 10), // Placeholder
          totalInjuries: recentRecords.filter(r => r.injury_status === 'injured').length,
          checkinStreak: Math.floor(Math.random() * 15), // Placeholder
          avgFitness: Math.round(avgFitness)
        });
      } else if (['coach', 'staff', 'medical'].includes(userRole) || isSuperAdmin) {
        // Fetch team/organization overview
        const { data: allRecords } = await supabase
          .from('health_wellness')
          .select('*')
          .order('date', { ascending: false });

        const records = allRecords || [];
        setHealthData({
          totalPlayers: new Set(records.map(r => r.player_id)).size,
          activeInjuries: records.filter(r => r.injury_status === 'injured').length,
          avgFitness: records.length > 0 
            ? Math.round(records.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / records.length)
            : 0,
          recentCheckIns: records.filter(r => {
            const recordDate = new Date(r.date);
            const today = new Date();
            return recordDate.toDateString() === today.toDateString();
          }).length
        });
      }
    } catch (error) {
      console.error('Error fetching health overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
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

  // Player Dashboard
  if (userRole === 'player') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Health Dashboard</h2>
            <p className="text-gray-600">Monitor player wellness, injuries, and medical information</p>
          </div>
          <div className="flex gap-2">
            <Button 
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              onClick={() => setEmergencyModalOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              EMERGENCY
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              onClick={() => setAiAnalysisModalOpen(true)}
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Analysis
            </Button>
          </div>
        </div>

        {/* Player Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-purple-200 hover:border-purple-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sleep Quality</CardTitle>
              <Moon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.sleepQuality}/10</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 hover:border-yellow-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Energy Level</CardTitle>
              <Zap className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.energyLevel}/10</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 hover:border-red-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Injuries</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.totalInjuries}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:border-green-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-in Streak</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthData.checkinStreak}</div>
              <p className="text-xs text-muted-foreground">Days</p>
            </CardContent>
          </Card>
        </div>

        {/* Health Analytics Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Wellness Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground">Track your wellness metrics over time</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Wellness trend chart coming soon</p>
                <p className="text-sm">Keep logging your daily check-ins to see trends</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <EmergencyAlertModal
          isOpen={emergencyModalOpen}
          onClose={() => setEmergencyModalOpen(false)}
          playerProfile={playerProfile}
        />
        
        <AIHealthAnalysisModal
          isOpen={aiAnalysisModalOpen}
          onClose={() => setAiAnalysisModalOpen(false)}
          playerProfile={playerProfile}
          userRole={userRole}
        />
      </div>
    );
  }

  // Staff/Coach/Medical Dashboard
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Health Analytics</h2>
          <p className="text-gray-600">Comprehensive health and wellness data analysis</p>
        </div>
      </div>

      {/* Team Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.totalPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">Active in system</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Injuries</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.activeInjuries || 0}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fitness</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.avgFitness || 0}</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Check-ins</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData.recentCheckIns || 0}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Team Health Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground">Monitor team wellness and performance metrics</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Team health analytics coming soon</p>
              <p className="text-sm">Comprehensive team health insights and trends</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals for Staff/Medical Dashboard */}
      <EmergencyAlertModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        playerProfile={null}
      />
      
      <AIHealthAnalysisModal
        isOpen={aiAnalysisModalOpen}
        onClose={() => setAiAnalysisModalOpen(false)}
        playerProfile={null}
        userRole={userRole}
      />
    </div>
  );
};

export default HealthDashboard;