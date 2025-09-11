import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerStats {
  totalShots: number;
  totalMakes: number;
  shootingPercentage: number;
  avgPoints: number;
  gamesPlayed: number;
  fitnessScore: number;
  checkInStreak: number;
  recentPerformance: Array<{
    id: string;
    date: string;
    opponent?: string;
    points: number;
    made_shots: number;
    total_shots: number;
    percentage: number;
  }>;
}

interface UsePlayerStatsReturn {
  stats: PlayerStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerStats = (playerId?: string): UsePlayerStatsReturn => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      // Fetch shooting data from shots table
      const shotsPromise = supabase
        .from('shots')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      // Fetch health data for fitness score
      const healthPromise = supabase
        .from('daily_health_checkins')
        .select('energy_level, training_readiness, check_in_date')
        .eq('player_id', playerId)
        .gte('check_in_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('check_in_date', { ascending: false });

      const [shotsResult, healthResult] = await Promise.race([
        Promise.all([shotsPromise, healthPromise]),
        timeoutPromise
      ]) as any;

      const { data: shots, error: shotsError } = shotsResult[0];
      const { data: healthData, error: healthError } = shotsResult[1];

      if (shotsError && shotsError.code !== 'PGRST116') {
        throw shotsError;
      }

      if (healthError && healthError.code !== 'PGRST116') {
        throw healthError;
      }

      // Calculate shooting stats
      const totalShots = shots?.length || 0;
      const totalMakes = shots?.filter(shot => shot.made).length || 0;
      const shootingPercentage = totalShots > 0 ? (totalMakes / totalShots) * 100 : 0;

      // Calculate fitness score from health data
      const recentHealth = healthData?.slice(0, 7) || [];
      const avgEnergyLevel = recentHealth.length > 0 
        ? recentHealth.reduce((sum, day) => sum + (day.energy_level || 5), 0) / recentHealth.length
        : 5;
      const avgReadiness = recentHealth.length > 0
        ? recentHealth.reduce((sum, day) => sum + (day.training_readiness || 5), 0) / recentHealth.length
        : 5;
      const fitnessScore = Math.round(((avgEnergyLevel + avgReadiness) / 10) * 100);

      // Calculate check-in streak
      const sortedDates = healthData?.map(h => h.check_in_date).sort() || [];
      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sortedDates.length; i++) {
        const checkDate = new Date(sortedDates[sortedDates.length - 1 - i]);
        checkDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(currentDate.getTime() - (i * 24 * 60 * 60 * 1000));
        
        if (checkDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }

      // Group shots by session/date for recent performance
      const recentShots = shots?.slice(0, 50) || [];
      const performanceByDate = recentShots.reduce((acc, shot) => {
        const date = shot.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            shots: [],
            points: 0
          };
        }
        acc[date].shots.push(shot);
        // Assume 2 points per made shot (could be enhanced with shot value)
        if (shot.made) {
          acc[date].points += 2;
        }
        return acc;
      }, {} as Record<string, any>);

      const recentPerformance = Object.values(performanceByDate)
        .slice(0, 5)
        .map((session: any) => ({
          id: session.date,
          date: session.date,
          points: session.points,
          made_shots: session.shots.filter((s: any) => s.made).length,
          total_shots: session.shots.length,
          percentage: session.shots.length > 0 
            ? (session.shots.filter((s: any) => s.made).length / session.shots.length) * 100
            : 0
        }));

      setStats({
        totalShots,
        totalMakes,
        shootingPercentage,
        avgPoints: recentPerformance.length > 0 
          ? recentPerformance.reduce((sum, p) => sum + p.points, 0) / recentPerformance.length
          : 0,
        gamesPlayed: recentPerformance.length,
        fitnessScore,
        checkInStreak: streak,
        recentPerformance
      });
    } catch (err: any) {
      console.error('Error fetching player stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [playerId]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};