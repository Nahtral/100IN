import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalShots: number;
  totalMakes: number;
  shootingPercentage: number;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
  avgTrainingReadiness: number;
  healthyPlayers: number;
  injuredPlayers: number;
  recentActivity: any[];
}

export const useRealAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch shot analytics
      const { data: shotStats, error: shotError } = await supabase
        .from('shots')
        .select('made, arc_degrees, depth_inches');

      if (shotError) throw shotError;

      // Fetch player statistics
      const { data: playerStats, error: playerError } = await supabase
        .from('players')
        .select('total_shots, total_makes, shooting_percentage, is_active');

      if (playerError) throw playerError;

      // Fetch health check-ins for training readiness
      const { data: healthCheckins, error: healthError } = await supabase
        .from('daily_health_checkins')
        .select('training_readiness, energy_level')
        .gte('check_in_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (healthError) throw healthError;

      // Fetch health wellness for injury status
      const { data: healthWellness, error: wellnessError } = await supabase
        .from('health_wellness')
        .select('injury_status')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (wellnessError) throw wellnessError;

      // Fetch recent analytics events
      const { data: recentEvents, error: eventsError } = await supabase
        .from('analytics_events')
        .select('event_type, created_at, event_data')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      // Fetch session count
      const { data: sessions, error: sessionError } = await supabase
        .from('shot_sessions')
        .select('id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (sessionError) throw sessionError;

      // Calculate analytics
      const totalShots = shotStats?.length || 0;
      const totalMakes = shotStats?.filter(shot => shot.made).length || 0;
      const shootingPercentage = totalShots > 0 ? (totalMakes / totalShots) * 100 : 0;
      
      const totalPlayers = playerStats?.length || 0;
      const activePlayers = playerStats?.filter(player => player.is_active).length || 0;
      
      const avgTrainingReadiness = healthCheckins?.length > 0 
        ? healthCheckins.reduce((sum, check) => sum + (check.training_readiness || 0), 0) / healthCheckins.length
        : 0;

      const healthyPlayers = healthWellness?.filter(h => h.injury_status === 'healthy').length || 0;
      const injuredPlayers = healthWellness?.filter(h => h.injury_status === 'injured').length || 0;

      const analyticsData: AnalyticsData = {
        totalShots,
        totalMakes,
        shootingPercentage,
        totalPlayers,
        activePlayers,
        totalSessions: sessions?.length || 0,
        avgTrainingReadiness,
        healthyPlayers,
        injuredPlayers,
        recentActivity: recentEvents || []
      };

      setData(analyticsData);
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'Failed to fetch analytics data');
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchAnalyticsData();
  };

  return {
    data,
    loading,
    error,
    refreshData
  };
};