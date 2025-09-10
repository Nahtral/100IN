import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface HealthMetrics {
  avgSleepQuality: number;
  avgEnergyLevel: number;
  avgTrainingReadiness: number;
  totalInjuries: number;
  checkinStreak: number;
  totalPlayers: number;
  activeInjuries: number;
  avgFitnessScore: number;
  dailyCheckInsToday: number;
  checkInCompletionRate: number;
  injuryTrendPercent: number;
  fitnessTrendPercent: number;
  checkInTrendPercent: number;
  recentCheckIns: any[];
  healthRecords: any[];
  lastUpdated: Date;
}

interface HealthContextType {
  metrics: HealthMetrics;
  loading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
  invalidateCache: () => void;
  subscribeToRealtime: (playerId?: string) => void;
  unsubscribeFromRealtime: () => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

// Cache management
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let metricsCache: { data: HealthMetrics; timestamp: number } | null = null;

const defaultMetrics: HealthMetrics = {
  avgSleepQuality: 0,
  avgEnergyLevel: 0,
  avgTrainingReadiness: 0,
  totalInjuries: 0,
  checkinStreak: 0,
  totalPlayers: 0,
  activeInjuries: 0,
  avgFitnessScore: 0,
  dailyCheckInsToday: 0,
  checkInCompletionRate: 0,
  injuryTrendPercent: 0,
  fitnessTrendPercent: 0,
  checkInTrendPercent: 0,
  recentCheckIns: [],
  healthRecords: [],
  lastUpdated: new Date()
};

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<HealthMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const invalidateCache = useCallback(() => {
    metricsCache = null;
  }, []);

  const calculatePlayerMetrics = useCallback(async (playerId: string): Promise<Partial<HealthMetrics>> => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const [checkInsResult, healthRecordsResult] = await Promise.all([
      supabase
        .from('daily_health_checkins')
        .select('*')
        .eq('player_id', playerId)
        .gte('check_in_date', startDate.toISOString().split('T')[0])
        .lte('check_in_date', endDate.toISOString().split('T')[0])
        .order('check_in_date', { ascending: false }),
      
      supabase
        .from('health_wellness')
        .select('*')
        .eq('player_id', playerId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
    ]);

    if (checkInsResult.error) throw checkInsResult.error;
    if (healthRecordsResult.error) throw healthRecordsResult.error;

    const checkIns = checkInsResult.data || [];
    const healthRecords = healthRecordsResult.data || [];

    const avgSleepQuality = checkIns.length > 0 
      ? Math.round((checkIns.reduce((sum, c) => sum + (c.sleep_quality || 0), 0) / checkIns.length) * 10) / 10
      : 0;

    const avgEnergyLevel = checkIns.length > 0
      ? Math.round((checkIns.reduce((sum, c) => sum + (c.energy_level || 0), 0) / checkIns.length) * 10) / 10
      : 0;

    const avgTrainingReadiness = checkIns.length > 0
      ? Math.round((checkIns.reduce((sum, c) => sum + (c.training_readiness || 0), 0) / checkIns.length) * 10) / 10
      : 0;

    const totalInjuries = healthRecords.filter(r => r.injury_status === 'injured').length;
    const checkinStreak = calculateCheckInStreak(checkIns);

    return {
      avgSleepQuality,
      avgEnergyLevel,
      avgTrainingReadiness,
      totalInjuries,
      checkinStreak,
      recentCheckIns: checkIns,
      healthRecords
    };
  }, []);

  const calculateTeamMetrics = useCallback(async (): Promise<Partial<HealthMetrics>> => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const prevStartDate = new Date();
    prevStartDate.setDate(startDate.getDate() - 30);

    const [currentCheckInsResult, prevCheckInsResult, currentHealthResult, prevHealthResult] = await Promise.all([
      supabase
        .from('daily_health_checkins')
        .select('*')
        .gte('check_in_date', startDate.toISOString().split('T')[0])
        .lte('check_in_date', endDate.toISOString().split('T')[0]),
      
      supabase
        .from('daily_health_checkins')
        .select('*')
        .gte('check_in_date', prevStartDate.toISOString().split('T')[0])
        .lt('check_in_date', startDate.toISOString().split('T')[0]),
      
      supabase
        .from('health_wellness')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]),
      
      supabase
        .from('health_wellness')
        .select('*')
        .gte('date', prevStartDate.toISOString().split('T')[0])
        .lt('date', startDate.toISOString().split('T')[0])
    ]);

    if (currentCheckInsResult.error) throw currentCheckInsResult.error;
    if (prevCheckInsResult.error) throw prevCheckInsResult.error;
    if (currentHealthResult.error) throw currentHealthResult.error;
    if (prevHealthResult.error) throw prevHealthResult.error;

    const currentCheckIns = currentCheckInsResult.data || [];
    const prevCheckIns = prevCheckInsResult.data || [];
    const currentHealth = currentHealthResult.data || [];
    const prevHealth = prevHealthResult.data || [];

    const totalPlayers = new Set([
      ...currentCheckIns.map(c => c.player_id),
      ...currentHealth.map(h => h.player_id)
    ]).size;

    const activeInjuries = currentHealth.filter(r => r.injury_status === 'injured').length;
    const avgFitnessScore = currentHealth.length > 0
      ? Math.round(currentHealth.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / currentHealth.length)
      : 0;

    const today = new Date().toISOString().split('T')[0];
    const dailyCheckInsToday = currentCheckIns.filter(c => c.check_in_date === today).length;
    const checkInCompletionRate = totalPlayers > 0 ? Math.round((dailyCheckInsToday / totalPlayers) * 100) : 0;

    // Calculate trends
    const prevActiveInjuries = prevHealth.filter(r => r.injury_status === 'injured').length;
    const injuryTrendPercent = prevActiveInjuries > 0 
      ? Math.round(((activeInjuries - prevActiveInjuries) / prevActiveInjuries) * 100)
      : 0;

    const prevAvgFitness = prevHealth.length > 0
      ? prevHealth.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / prevHealth.length
      : 0;
    const fitnessTrendPercent = prevAvgFitness > 0
      ? Math.round(((avgFitnessScore - prevAvgFitness) / prevAvgFitness) * 100)
      : 0;

    const checkInTrendPercent = prevCheckIns.length > 0
      ? Math.round(((currentCheckIns.length - prevCheckIns.length) / prevCheckIns.length) * 100)
      : 0;

    return {
      totalPlayers,
      activeInjuries,
      avgFitnessScore,
      dailyCheckInsToday,
      checkInCompletionRate,
      injuryTrendPercent,
      fitnessTrendPercent,
      checkInTrendPercent,
      recentCheckIns: currentCheckIns,
      healthRecords: currentHealth
    };
  }, []);

  const calculateCheckInStreak = useCallback((checkIns: any[]): number => {
    if (checkIns.length === 0) return 0;

    const sorted = checkIns.sort((a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime());
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sorted.length; i++) {
      const checkInDate = new Date(sorted[i].check_in_date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (checkInDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }, []);

  const fetchMetrics = useCallback(async (playerProfile?: any, userRole?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_DURATION) {
        setMetrics(metricsCache.data);
        setLoading(false);
        return;
      }

      let newMetrics: Partial<HealthMetrics> = {};

      if (userRole === 'player' && playerProfile) {
        newMetrics = await calculatePlayerMetrics(playerProfile.id);
      } else {
        newMetrics = await calculateTeamMetrics();
      }

      const updatedMetrics: HealthMetrics = {
        ...defaultMetrics,
        ...newMetrics,
        lastUpdated: new Date()
      };

      // Update cache
      metricsCache = {
        data: updatedMetrics,
        timestamp: Date.now()
      };

      setMetrics(updatedMetrics);
    } catch (err: any) {
      console.error('Error fetching health metrics:', err);
      setError(err.message || 'Failed to fetch health metrics');
      toast({
        title: "Error",
        description: "Failed to load health metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [calculatePlayerMetrics, calculateTeamMetrics, toast]);

  const refreshMetrics = useCallback(async (): Promise<void> => {
    invalidateCache();
    // We'll need to pass the current user role and profile from where this is called
    await fetchMetrics();
  }, [fetchMetrics, invalidateCache]);

  const subscribeToRealtime = useCallback((playerId?: string) => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    const channel = supabase
      .channel('health-metrics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_health_checkins',
          ...(playerId && { filter: `player_id=eq.${playerId}` })
        },
        (payload) => {
          console.log('Health check-in update:', payload);
          invalidateCache();
          refreshMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_wellness',
          ...(playerId && { filter: `player_id=eq.${playerId}` })
        },
        (payload) => {
          console.log('Health wellness update:', payload);
          invalidateCache();
          refreshMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medical_appointments',
          ...(playerId && { filter: `player_id=eq.${playerId}` })
        },
        (payload) => {
          console.log('Medical appointment update:', payload);
          invalidateCache();
          refreshMetrics();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);
  }, [realtimeChannel, invalidateCache, refreshMetrics]);

  const unsubscribeFromRealtime = useCallback(() => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
    }
  }, [realtimeChannel]);

  useEffect(() => {
    return () => {
      unsubscribeFromRealtime();
    };
  }, [unsubscribeFromRealtime]);

  const contextValue: HealthContextType = {
    metrics,
    loading,
    error,
    refreshMetrics,
    invalidateCache,
    subscribeToRealtime,
    unsubscribeFromRealtime
  };

  return (
    <HealthContext.Provider value={contextValue}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealthContext = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealthContext must be used within a HealthProvider');
  }
  return context;
};