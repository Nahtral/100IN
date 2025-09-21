import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedPlayerAnalytics {
  player_id: string;
  player_name: string;
  jersey_number: number | null;
  team_name: string | null;
  team_id: string | null;
  performance_data: {
    total_evaluations: number;
    avg_overall_grade: number;
    avg_shooting: number;
    avg_passing: number;
    avg_dribbling: number;
    avg_defense: number;
    last_evaluation_date: string | null;
    performance_level: string;
  };
  health_data: {
    total_checkins: number;
    avg_energy_level: number;
    avg_sleep_quality: number;
    avg_training_readiness: number;
    last_checkin_date: string | null;
    active_injuries: number;
    avg_fitness_score: number;
  };
  attendance_data: {
    total_events: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    excused_count: number;
    attendance_percentage: number;
  };
}

interface UseEnhancedAnalyticsReturn {
  analytics: EnhancedPlayerAnalytics[];
  loading: boolean;
  error: string | null;
  refreshAnalytics: () => void;
}

export const useEnhancedAnalytics = (timeframeDays: number = 30): UseEnhancedAnalyticsReturn => {
  const [analytics, setAnalytics] = useState<EnhancedPlayerAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('rpc_get_player_analytics_detailed', { 
          timeframe_days: timeframeDays 
        });

      if (rpcError) {
        throw rpcError;
      }

      setAnalytics((data || []) as EnhancedPlayerAnalytics[]);
    } catch (err: any) {
      console.error('Error fetching enhanced analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [timeframeDays]);

  const refreshAnalytics = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscriptions
    const channel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_player_grades'
        },
        () => {
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_health_checkins'
        },
        () => {
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics
  };
};