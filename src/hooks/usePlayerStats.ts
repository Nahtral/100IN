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

      // Fetch shooting data from shots table
      const { data: shots, error: shotsError } = await supabase
        .from('shots')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (shotsError) {
        console.warn('Error fetching shots data:', shotsError);
      }

      // Fetch health data for fitness score (optional)
      const { data: healthData, error: healthError } = await supabase
        .from('daily_health_checkins')
        .select('energy_level, training_readiness, check_in_date')
        .eq('player_id', playerId)
        .gte('check_in_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('check_in_date', { ascending: false });

      if (healthError) {
        console.warn('Error fetching health data:', healthError);
      }

      // Calculate shooting stats from real data
      const shotData = shots || [];
      const totalShots = shotData.length;
      const totalMakes = shotData.filter(shot => shot.made).length;
      const shootingPercentage = totalShots > 0 ? (totalMakes / totalShots) * 100 : 0;

      // Calculate fitness score from health data
      const recentHealth = (healthData || []).slice(0, 7);
      const avgEnergyLevel = recentHealth.length > 0 
        ? recentHealth.reduce((sum, day) => sum + (day.energy_level || 5), 0) / recentHealth.length
        : 75; // Default fitness score when no health data

      const avgReadiness = recentHealth.length > 0
        ? recentHealth.reduce((sum, day) => sum + (day.training_readiness || 5), 0) / recentHealth.length
        : 75;

      const fitnessScore = Math.round(((avgEnergyLevel + avgReadiness) / 10) * 100);

      // Calculate check-in streak
      const healthDates = (healthData || []).map(h => h.check_in_date).sort().reverse();
      let checkInStreak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < healthDates.length; i++) {
        const checkDate = new Date(healthDates[i]);
        checkDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(currentDate.getTime() - (i * 24 * 60 * 60 * 1000));
        
        if (checkDate.getTime() === expectedDate.getTime()) {
          checkInStreak++;
        } else {
          break;
        }
      }

      // Group shots by session/date for recent performance
      const performanceByDate = shotData.reduce((acc, shot) => {
        const date = shot.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            shots: [],
            points: 0
          };
        }
        acc[date].shots.push(shot);
        // Calculate points based on shot type and make/miss
        if (shot.made) {
          // Assume 2 points for made shots (could be enhanced with 3-point detection)
          acc[date].points += 2;
        }
        return acc;
      }, {} as Record<string, any>);

      // Create recent performance array from the most recent sessions
      const recentPerformance = Object.values(performanceByDate)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
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

      // Calculate average points per session
      const avgPoints = recentPerformance.length > 0 
        ? recentPerformance.reduce((sum, p) => sum + p.points, 0) / recentPerformance.length
        : 0;

      setStats({
        totalShots,
        totalMakes,
        shootingPercentage,
        avgPoints,
        gamesPlayed: recentPerformance.length,
        fitnessScore: Math.max(fitnessScore, 0), // Ensure non-negative
        checkInStreak,
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