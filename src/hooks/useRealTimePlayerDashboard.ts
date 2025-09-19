import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlayerDashboardData {
  player: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    jersey_number: number | null;
    team_name: string | null;
    team_id: string | null;
  } | null;
  stats: {
    totalShots: number;
    totalMakes: number;
    shootingPercentage: number;
    avgPoints: number;
    gamesPlayed: number;
    fitnessScore: number;
    checkInStreak: number;
    energyLevel: number;
  };
  recentPerformance: Array<{
    id: string;
    date: string;
    points: number;
    made_shots: number;
    total_shots: number;
    percentage: number;
    opponent: string;
  }>;
  goals: Array<{
    id: string;
    goal_type: string;
    metric_name: string;
    target_value: number;
    current_value: number;
    progress_percentage: number;
    priority: number;
    notes: string | null;
    is_active: boolean;
    status: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_type: string;
    location: string | null;
    status: string;
  }>;
  goalsSummary: {
    activeCount: number;
    completedCount: number;
    avgProgress: number;
  };
  lastUpdated: string;
}

interface RpcResponse {
  error?: string;
  player?: any;
  stats?: any;
  recentPerformance?: any[];
  goals?: any[];
  upcomingEvents?: any[];
  goalsSummary?: any;
  lastUpdated?: string;
}

interface UseRealTimePlayerDashboardReturn {
  data: PlayerDashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRealTime: boolean;
}

export const useRealTimePlayerDashboard = (playerId?: string): UseRealTimePlayerDashboardReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the new unified RPC function
      const { data: dashboardData, error: rpcError } = await supabase
        .rpc('rpc_get_player_dashboard_v2', { target_player_id: playerId });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw rpcError;
      }

      if (!dashboardData) {
        throw new Error('No dashboard data returned');
      }

      const response = dashboardData as RpcResponse;

      if (response.error) {
        throw new Error(response.error);
      }

      // Transform the data to match our interface
      const transformedData: PlayerDashboardData = {
        player: response.player || null,
        stats: response.stats || {
          totalShots: 0,
          totalMakes: 0,
          shootingPercentage: 0,
          avgPoints: 0,
          gamesPlayed: 0,
          fitnessScore: 75,
          checkInStreak: 0,
          energyLevel: 5
        },
        recentPerformance: (response.recentPerformance || []).map((perf: any) => ({
          ...perf,
          opponent: perf.opponent || 'Training Session'
        })),
        goals: response.goals || [],
        upcomingEvents: (response.upcomingEvents || []).map((event: any) => ({
          ...event,
          status: event.status || 'scheduled'
        })),
        goalsSummary: response.goalsSummary || {
          activeCount: 0,
          completedCount: 0,
          avgProgress: 0
        },
        lastUpdated: response.lastUpdated || new Date().toISOString()
      };

      setData(transformedData);
      setIsRealTime(true);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      setIsRealTime(false);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchDashboardData();

    if (!playerId) return;

    // Set up real-time subscriptions for all relevant tables
    const channels: any[] = [];

    // Subscribe to shots changes
    const shotsChannel = supabase
      .channel(`player-shots-${playerId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'shots', filter: `player_id=eq.${playerId}` },
        (payload) => {
          console.log('Real-time update: shots', payload);
          fetchDashboardData();
        }
      )
      .subscribe();
    channels.push(shotsChannel);

    // Subscribe to health check-ins changes
    const healthChannel = supabase
      .channel(`player-health-${playerId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'daily_health_checkins', filter: `player_id=eq.${playerId}` },
        (payload) => {
          console.log('Real-time update: health check-ins', payload);
          fetchDashboardData();
        }
      )
      .subscribe();
    channels.push(healthChannel);

    // Subscribe to development goals changes
    const goalsChannel = supabase
      .channel(`player-goals-${playerId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'development_goals', filter: `player_id=eq.${playerId}` },
        (payload) => {
          console.log('Real-time update: goals', payload);
          fetchDashboardData();
        }
      )
      .subscribe();
    channels.push(goalsChannel);

    // Subscribe to player performance changes
    const performanceChannel = supabase
      .channel(`player-performance-${playerId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'player_performance', filter: `player_id=eq.${playerId}` },
        (payload) => {
          console.log('Real-time update: performance', payload);
          fetchDashboardData();
        }
      )
      .subscribe();
    channels.push(performanceChannel);

    // Subscribe to attendance changes
    const attendanceChannel = supabase
      .channel(`player-attendance-${playerId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance', filter: `player_id=eq.${playerId}` },
        (payload) => {
          console.log('Real-time update: attendance', payload);
          fetchDashboardData();
        }
      )
      .subscribe();
    channels.push(attendanceChannel);

    // Get player's team and subscribe to schedule changes for that team
    if (data?.player?.team_id) {
      const scheduleChannel = supabase
        .channel(`team-schedule-${data.player.team_id}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'schedules', filter: `team_id=eq.${data.player.team_id}` },
          (payload) => {
            console.log('Real-time update: schedule', payload);
            fetchDashboardData();
          }
        )
        .subscribe();
      channels.push(scheduleChannel);
    }

    // Cleanup function
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [playerId, fetchDashboardData, data?.player?.team_id]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
    isRealTime
  };
};

// Legacy compatibility - export individual hook functions for existing components
export const usePlayerStatsRealTime = (playerId?: string) => {
  const { data, loading, error, refetch } = useRealTimePlayerDashboard(playerId);
  
  return {
    stats: data?.stats || null,
    loading,
    error,
    refetch
  };
};

export const usePlayerGoalsRealTime = (playerId?: string) => {
  const { data, loading, error, refetch } = useRealTimePlayerDashboard(playerId);
  
  return {
    goals: data?.goals || [],
    loading,
    error,
    refetch,
    createGoal: async () => {}, // Placeholder for now
    updateGoal: async () => {}  // Placeholder for now
  };
};

export const usePlayerScheduleRealTime = (playerId?: string) => {
  const { data, loading, error, refetch } = useRealTimePlayerDashboard(playerId);
  
  return {
    events: data?.upcomingEvents || [],
    loading,
    error,
    refetch
  };
};