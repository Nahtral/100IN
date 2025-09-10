import { useState, useEffect, useCallback } from 'react';
import { useHealthContext } from '@/contexts/HealthContext';

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
  const { 
    metrics, 
    loading, 
    error, 
    refreshMetrics, 
    subscribeToRealtime, 
    unsubscribeFromRealtime 
  } = useHealthContext();

  // Set up real-time subscriptions
  useEffect(() => {
    if (userRole === 'player' && playerProfile) {
      subscribeToRealtime(playerProfile.id);
    } else if (['coach', 'staff', 'medical'].includes(userRole)) {
      subscribeToRealtime(); // Subscribe to all changes
    }

    return () => {
      unsubscribeFromRealtime();
    };
  }, [userRole, playerProfile, subscribeToRealtime, unsubscribeFromRealtime]);

  // Initial data fetch
  useEffect(() => {
    refreshMetrics();
  }, [playerProfile, userRole, timeframeDays]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
};