import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateRealData, logDataSource } from '@/utils/realDataValidator';

export interface HealthAnalyticsData {
  totalPlayers: number;
  activeInjuries: number;
  avgFitnessScore: number;
  dailyCheckInsToday: number;
  checkInCompletionRate: number;
  injuryTrendPercent: number;
  fitnessTrendPercent: number;
  checkInTrendPercent: number;
  injuryDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  fitnessDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  healthTrends: Array<{
    date: string;
    avgFitness: number;
    checkIns: number;
    injuries: number;
  }>;
}

export const useHealthAnalyticsReal = (timeframeDays: number = 30) => {
  const [data, setData] = useState<HealthAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframeDays);
        
        const today = new Date().toISOString().split('T')[0];

        // Get all players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, user_id, is_active')
          .eq('is_active', true);

        if (playersError) throw playersError;

        const totalPlayers = playersData?.length || 0;

        // Get active injuries
        const { data: injuriesData, error: injuriesError } = await supabase
          .from('injury_reports')
          .select('id, injury_location, status, date_occurred')
          .eq('status', 'active')
          .gte('date_occurred', startDate.toISOString().split('T')[0]);

        if (injuriesError) throw injuriesError;

        const activeInjuries = injuriesData?.length || 0;

        // Get health wellness data for fitness scores
        const { data: healthData, error: healthError } = await supabase
          .from('health_wellness')
          .select('fitness_score, date, player_id')
          .gte('date', startDate.toISOString().split('T')[0])
          .not('fitness_score', 'is', null);

        if (healthError) throw healthError;

        // Calculate average fitness score
        const avgFitnessScore = healthData && healthData.length > 0
          ? Math.round(healthData.reduce((sum, h) => sum + (h.fitness_score || 0), 0) / healthData.length)
          : 0;

        // Get daily check-ins for today
        const { data: checkInsToday, error: checkInsError } = await supabase
          .from('daily_health_checkins')
          .select('id')
          .eq('check_in_date', today);

        if (checkInsError) throw checkInsError;

        const dailyCheckInsToday = checkInsToday?.length || 0;

        // Calculate check-in completion rate
        const checkInCompletionRate = totalPlayers > 0 
          ? Math.round((dailyCheckInsToday / totalPlayers) * 100)
          : 0;

        // Get injury distribution
        const injuryTypes = injuriesData?.reduce((acc, injury) => {
          const type = injury.injury_location || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const injuryDistribution = Object.entries(injuryTypes).map(([type, count]) => ({
          type,
          count,
          percentage: activeInjuries > 0 ? Math.round((count / activeInjuries) * 100) : 0
        }));

        // Get fitness distribution
        const fitnessRanges = [
          { range: '80-100', min: 80, max: 100 },
          { range: '60-79', min: 60, max: 79 },
          { range: '40-59', min: 40, max: 59 },
          { range: 'Below 40', min: 0, max: 39 }
        ];

        const fitnessDistribution = fitnessRanges.map(range => {
          const count = healthData?.filter(h => 
            h.fitness_score >= range.min && h.fitness_score <= range.max
          ).length || 0;
          
          return {
            range: range.range,
            count,
            percentage: healthData && healthData.length > 0 
              ? Math.round((count / healthData.length) * 100) 
              : 0
          };
        });

        // Calculate trends (simplified - comparing first half vs second half of timeframe)
        const midPoint = new Date(startDate.getTime() + (Date.now() - startDate.getTime()) / 2);
        
        const recentHealth = healthData?.filter(h => new Date(h.date) >= midPoint) || [];
        const olderHealth = healthData?.filter(h => new Date(h.date) < midPoint) || [];
        
        const recentAvgFitness = recentHealth.length > 0
          ? recentHealth.reduce((sum, h) => sum + (h.fitness_score || 0), 0) / recentHealth.length
          : 0;
        const olderAvgFitness = olderHealth.length > 0
          ? olderHealth.reduce((sum, h) => sum + (h.fitness_score || 0), 0) / olderHealth.length
          : 0;

        const fitnessTrendPercent = olderAvgFitness > 0 
          ? Math.round(((recentAvgFitness - olderAvgFitness) / olderAvgFitness) * 100)
          : 0;

        // Weekly health trends
        const weeklyMap = new Map();
        healthData?.forEach(h => {
          const weekStart = new Date(h.date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { fitness: [], checkIns: 0, injuries: 0 });
          }
          
          const week = weeklyMap.get(weekKey);
          if (h.fitness_score) week.fitness.push(h.fitness_score);
        });

        const healthTrends = Array.from(weeklyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([date, data]) => ({
            date,
            avgFitness: data.fitness.length > 0 
              ? Math.round(data.fitness.reduce((sum: number, f: number) => sum + f, 0) / data.fitness.length)
              : 0,
            checkIns: data.checkIns,
            injuries: data.injuries
          }));

        // Validate all data is real
        const healthAnalyticsData = {
          totalPlayers,
          activeInjuries,
          avgFitnessScore,
          dailyCheckInsToday,
          checkInCompletionRate,
          injuryTrendPercent: 0, // Would need time-series calculation
          fitnessTrendPercent,
          checkInTrendPercent: 0, // Would need time-series calculation
          injuryDistribution,
          fitnessDistribution,
          healthTrends
        };

        validateRealData('HealthAnalytics', healthAnalyticsData);
        logDataSource('HealthAnalytics', 'multiple tables', totalPlayers + activeInjuries + (healthData?.length || 0));

        setData(healthAnalyticsData);

      } catch (err: any) {
        console.error('Error fetching health analytics:', err);
        setError(err.message || 'Failed to load health analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchHealthAnalytics();
  }, [timeframeDays]);

  return { data, loading, error };
};