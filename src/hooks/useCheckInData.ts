import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CheckInData {
  id: string;
  player_id: string;
  check_in_date: string;
  energy_level?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  training_readiness?: number;
  mood?: number;
  additional_notes?: string;
  player_name?: string;
  team_name?: string;
}

export const useCheckInData = (dateRange?: { from: Date; to: Date }) => {
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCheckInData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('daily_health_checkins')
        .select(`
          id,
          player_id,
          check_in_date,
          energy_level,
          sleep_hours,
          sleep_quality,
          training_readiness,
          mood,
          additional_notes
        `);

      if (dateRange) {
        query = query
          .gte('check_in_date', dateRange.from.toISOString().split('T')[0])
          .lte('check_in_date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data: checkInsData, error: fetchError } = await query
        .order('check_in_date', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Get player and team info for each check-in
      const playerIds = checkInsData?.map(c => c.player_id) || [];
      
      if (playerIds.length > 0) {
        // Get player profiles
        const { data: playersData } = await supabase
          .from('players')
          .select(`
            id,
            user_id,
            profiles!inner(full_name)
          `)
          .in('id', playerIds);

        // Get team assignments
        const { data: teamData } = await supabase
          .from('player_teams')
          .select(`
            player_id,
            teams!inner(name)
          `)
          .in('player_id', playerIds);

        // Enrich check-ins with player and team data
        const enrichedCheckIns = checkInsData?.map(checkIn => {
          const player = playersData?.find(p => p.id === checkIn.player_id);
          const team = teamData?.find(t => t.player_id === checkIn.player_id);

          return {
            ...checkIn,
            player_name: player?.profiles?.full_name || 'Unknown Player',
            team_name: team?.teams?.name || 'No Team'
          };
        });

        setCheckIns(enrichedCheckIns || []);
      } else {
        setCheckIns([]);
      }
    } catch (err: any) {
      console.error('Error fetching check-in data:', err);
      const errorMsg = err.message || 'Failed to load check-in data';
      setError(errorMsg);
      
      if (err.message?.includes('permission denied')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view check-in data",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getCheckInStats = () => {
    if (checkIns.length === 0) return null;

    const totalCheckIns = checkIns.length;
    const uniquePlayers = new Set(checkIns.map(c => c.player_id)).size;
    const avgEnergyLevel = checkIns
      .filter(c => c.energy_level !== null)
      .reduce((sum, c) => sum + (c.energy_level || 0), 0) / 
      checkIns.filter(c => c.energy_level !== null).length || 0;
    
    const avgSleepHours = checkIns
      .filter(c => c.sleep_hours !== null)
      .reduce((sum, c) => sum + (c.sleep_hours || 0), 0) / 
      checkIns.filter(c => c.sleep_hours !== null).length || 0;

    return {
      totalCheckIns,
      uniquePlayers,
      avgEnergyLevel: Math.round(avgEnergyLevel * 10) / 10,
      avgSleepHours: Math.round(avgSleepHours * 10) / 10
    };
  };

  useEffect(() => {
    fetchCheckInData();
  }, [dateRange]);

  return {
    checkIns,
    loading,
    error,
    stats: getCheckInStats(),
    refetch: fetchCheckInData
  };
};