import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shot } from './useShotSessions';

export interface ShotAnalytics {
  totalShots: number;
  madeShots: number;
  shootingPercentage: number;
  averageArc: number;
  averageDepth: number;
  averageDeviation: number;
  consistencyScore: number;
  improvementTrend: number;
  bestSession: {
    date: string;
    percentage: number;
    shots: number;
  } | null;
  recentTrend: Array<{
    date: string;
    percentage: number;
    shots: number;
    makes: number;
  }>;
  shotDistribution: {
    closeRange: number;
    midRange: number;
    longRange: number;
  };
  arcAnalysis: {
    low: number;
    optimal: number;
    high: number;
  };
}

interface UseShotAnalyticsReturn {
  analytics: ShotAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useShotAnalytics = (playerId?: string, dateRange?: { start: string; end: string }): UseShotAnalyticsReturn => {
  const [analytics, setAnalytics] = useState<ShotAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query with optional date range
      let query = supabase
        .from('shots')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data: shots, error: shotsError } = await query.limit(1000);

      if (shotsError) {
        throw shotsError;
      }

      const shotData = shots || [];

      if (shotData.length === 0) {
        setAnalytics({
          totalShots: 0,
          madeShots: 0,
          shootingPercentage: 0,
          averageArc: 0,
          averageDepth: 0,
          averageDeviation: 0,
          consistencyScore: 0,
          improvementTrend: 0,
          bestSession: null,
          recentTrend: [],
          shotDistribution: { closeRange: 0, midRange: 0, longRange: 0 },
          arcAnalysis: { low: 0, optimal: 0, high: 0 }
        });
        return;
      }

      // Basic statistics
      const totalShots = shotData.length;
      const madeShots = shotData.filter(shot => shot.made).length;
      const shootingPercentage = (madeShots / totalShots) * 100;

      // Average metrics
      const averageArc = shotData.reduce((sum, shot) => sum + (shot.arc_degrees || 0), 0) / totalShots;
      const averageDepth = shotData.reduce((sum, shot) => sum + (shot.depth_inches || 0), 0) / totalShots;
      const averageDeviation = shotData.reduce((sum, shot) => sum + Math.abs(shot.lr_deviation_inches || 0), 0) / totalShots;

      // Consistency Score (based on standard deviation of arc and depth)
      const arcStdDev = calculateStandardDeviation(shotData.map(s => s.arc_degrees || 0));
      const depthStdDev = calculateStandardDeviation(shotData.map(s => s.depth_inches || 0));
      const consistencyScore = Math.max(0, 100 - (arcStdDev + depthStdDev) * 2);

      // Group shots by date for trend analysis
      const shotsByDate = shotData.reduce((acc, shot) => {
        const date = shot.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(shot);
        return acc;
      }, {} as Record<string, Shot[]>);

      // Recent trend (last 10 sessions/days)
      const recentTrend = Object.entries(shotsByDate)
        .map(([date, dayShots]) => ({
          date,
          shots: dayShots.length,
          makes: dayShots.filter(s => s.made).length,
          percentage: (dayShots.filter(s => s.made).length / dayShots.length) * 100
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .reverse();

      // Best session
      const bestSession = recentTrend.reduce((best, session) => {
        if (!best || (session.percentage > best.percentage && session.shots >= 5)) {
          return session;
        }
        return best;
      }, null as any);

      // Improvement trend (compare first half vs second half of recent data)
      const halfPoint = Math.floor(recentTrend.length / 2);
      const firstHalf = recentTrend.slice(0, halfPoint);
      const secondHalf = recentTrend.slice(halfPoint);
      
      const firstHalfAvg = firstHalf.length > 0 
        ? firstHalf.reduce((sum, s) => sum + s.percentage, 0) / firstHalf.length 
        : 0;
      const secondHalfAvg = secondHalf.length > 0 
        ? secondHalf.reduce((sum, s) => sum + s.percentage, 0) / secondHalf.length 
        : 0;
      
      const improvementTrend = secondHalfAvg - firstHalfAvg;

      // Shot distribution by depth
      const shotDistribution = {
        closeRange: shotData.filter(s => (s.depth_inches || 0) <= 10).length,
        midRange: shotData.filter(s => (s.depth_inches || 0) > 10 && (s.depth_inches || 0) <= 20).length,
        longRange: shotData.filter(s => (s.depth_inches || 0) > 20).length
      };

      // Arc analysis
      const arcAnalysis = {
        low: shotData.filter(s => (s.arc_degrees || 0) < 40).length,
        optimal: shotData.filter(s => (s.arc_degrees || 0) >= 40 && (s.arc_degrees || 0) <= 50).length,
        high: shotData.filter(s => (s.arc_degrees || 0) > 50).length
      };

      setAnalytics({
        totalShots,
        madeShots,
        shootingPercentage,
        averageArc,
        averageDepth,
        averageDeviation,
        consistencyScore,
        improvementTrend,
        bestSession,
        recentTrend,
        shotDistribution,
        arcAnalysis
      });

    } catch (err: any) {
      console.error('Error fetching shot analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [playerId, dateRange?.start, dateRange?.end]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
};

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}