import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthMetrics {
  // Player metrics
  avgSleepQuality: number;
  avgEnergyLevel: number;
  avgTrainingReadiness: number;
  totalInjuries: number;
  checkinStreak: number;
  
  // Team metrics  
  totalPlayers: number;
  activeInjuries: number;
  avgFitnessScore: number;
  dailyCheckInsToday: number;
  checkInCompletionRate: number;
  
  // Trends
  injuryTrendPercent: number;
  fitnessTrendPercent: number;
  checkInTrendPercent: number;
  
  // Raw data
  recentCheckIns: any[];
  healthRecords: any[];
}

interface UseHealthMetricsProps {
  playerProfile?: any;
  userRole: string;
  timeframeDays?: number;
}

export const useHealthMetrics = ({ 
  playerProfile, 
  userRole, 
  timeframeDays = 30 
}: UseHealthMetricsProps) => {
  const [metrics, setMetrics] = useState<HealthMetrics>({
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
    healthRecords: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHealthMetrics();
  }, [playerProfile, userRole, timeframeDays]);

  const fetchHealthMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - timeframeDays);

      const prevStartDate = new Date();
      prevStartDate.setDate(startDate.getDate() - timeframeDays);

      if (userRole === 'player' && playerProfile) {
        await fetchPlayerMetrics(playerProfile.id, startDate, endDate, prevStartDate);
      } else {
        await fetchTeamMetrics(startDate, endDate, prevStartDate);
      }
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
  };

  const fetchPlayerMetrics = async (playerId: string, startDate: Date, endDate: Date, prevStartDate: Date) => {
    // Fetch daily check-ins for player
    const { data: checkIns, error: checkInError } = await supabase
      .from('daily_health_checkins')
      .select('*')
      .eq('player_id', playerId)
      .gte('check_in_date', startDate.toISOString().split('T')[0])
      .lte('check_in_date', endDate.toISOString().split('T')[0])
      .order('check_in_date', { ascending: false });

    if (checkInError) throw checkInError;

    // Fetch health wellness records
    const { data: healthRecords, error: healthError } = await supabase
      .from('health_wellness')
      .select('*')
      .eq('player_id', playerId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (healthError) throw healthError;

    // Calculate player metrics
    const recentCheckIns = checkIns || [];
    const records = healthRecords || [];

    const avgSleepQuality = recentCheckIns.length > 0 
      ? Math.round((recentCheckIns.reduce((sum, c) => sum + (c.sleep_quality || 0), 0) / recentCheckIns.length) * 10) / 10
      : 0;

    const avgEnergyLevel = recentCheckIns.length > 0
      ? Math.round((recentCheckIns.reduce((sum, c) => sum + (c.energy_level || 0), 0) / recentCheckIns.length) * 10) / 10
      : 0;

    const avgTrainingReadiness = recentCheckIns.length > 0
      ? Math.round((recentCheckIns.reduce((sum, c) => sum + (c.training_readiness || 0), 0) / recentCheckIns.length) * 10) / 10
      : 0;

    const totalInjuries = records.filter(r => r.injury_status === 'injured').length;
    
    // Calculate check-in streak
    const checkinStreak = calculateCheckInStreak(recentCheckIns);

    setMetrics(prev => ({
      ...prev,
      avgSleepQuality,
      avgEnergyLevel,
      avgTrainingReadiness,
      totalInjuries,
      checkinStreak,
      recentCheckIns,
      healthRecords: records
    }));
  };

  const fetchTeamMetrics = async (startDate: Date, endDate: Date, prevStartDate: Date) => {
    // Fetch all daily check-ins in period
    const { data: currentCheckIns, error: currentError } = await supabase
      .from('daily_health_checkins')
      .select('*')
      .gte('check_in_date', startDate.toISOString().split('T')[0])
      .lte('check_in_date', endDate.toISOString().split('T')[0]);

    if (currentError) throw currentError;

    // Fetch previous period for trends
    const { data: prevCheckIns, error: prevError } = await supabase
      .from('daily_health_checkins')
      .select('*')
      .gte('check_in_date', prevStartDate.toISOString().split('T')[0])
      .lt('check_in_date', startDate.toISOString().split('T')[0]);

    if (prevError) throw prevError;

    // Fetch health wellness records
    const { data: currentHealthRecords, error: healthCurrentError } = await supabase
      .from('health_wellness')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (healthCurrentError) throw healthCurrentError;

    const { data: prevHealthRecords, error: healthPrevError } = await supabase
      .from('health_wellness')
      .select('*')
      .gte('date', prevStartDate.toISOString().split('T')[0])
      .lt('date', startDate.toISOString().split('T')[0]);

    if (healthPrevError) throw healthPrevError;

    // Calculate team metrics
    const currentCheckInsData = currentCheckIns || [];
    const prevCheckInsData = prevCheckIns || [];
    const currentHealthData = currentHealthRecords || [];
    const prevHealthData = prevHealthRecords || [];

    const totalPlayers = new Set([
      ...currentCheckInsData.map(c => c.player_id),
      ...currentHealthData.map(h => h.player_id)
    ]).size;

    const activeInjuries = currentHealthData.filter(r => r.injury_status === 'injured').length;

    const avgFitnessScore = currentHealthData.length > 0
      ? Math.round(currentHealthData.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / currentHealthData.length)
      : 0;

    // Today's check-ins
    const today = new Date().toISOString().split('T')[0];
    const dailyCheckInsToday = currentCheckInsData.filter(c => c.check_in_date === today).length;

    // Check-in completion rate (assuming we know how many players should check in)
    const expectedDailyCheckIns = totalPlayers;
    const checkInCompletionRate = expectedDailyCheckIns > 0 
      ? Math.round((dailyCheckInsToday / expectedDailyCheckIns) * 100)
      : 0;

    // Calculate trends
    const prevActiveInjuries = prevHealthData.filter(r => r.injury_status === 'injured').length;
    const injuryTrendPercent = prevActiveInjuries > 0 
      ? Math.round(((activeInjuries - prevActiveInjuries) / prevActiveInjuries) * 100)
      : 0;

    const prevAvgFitness = prevHealthData.length > 0
      ? prevHealthData.reduce((sum, r) => sum + (r.fitness_score || 0), 0) / prevHealthData.length
      : 0;
    const fitnessTrendPercent = prevAvgFitness > 0
      ? Math.round(((avgFitnessScore - prevAvgFitness) / prevAvgFitness) * 100)
      : 0;

    const prevCheckInCount = prevCheckInsData.length;
    const currentCheckInCount = currentCheckInsData.length;
    const checkInTrendPercent = prevCheckInCount > 0
      ? Math.round(((currentCheckInCount - prevCheckInCount) / prevCheckInCount) * 100)
      : 0;

    setMetrics(prev => ({
      ...prev,
      totalPlayers,
      activeInjuries,
      avgFitnessScore,
      dailyCheckInsToday,
      checkInCompletionRate,
      injuryTrendPercent,
      fitnessTrendPercent,
      checkInTrendPercent,
      recentCheckIns: currentCheckInsData,
      healthRecords: currentHealthData
    }));
  };

  const calculateCheckInStreak = (checkIns: any[]): number => {
    if (checkIns.length === 0) return 0;

    // Sort by date descending
    const sorted = checkIns.sort((a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime());
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sorted.length; i++) {
      const checkInDate = new Date(sorted[i].check_in_date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      // If the check-in is from the expected date, continue streak
      if (checkInDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const refreshMetrics = () => {
    fetchHealthMetrics();
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
};