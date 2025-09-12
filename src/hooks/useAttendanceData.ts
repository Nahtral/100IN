import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchPlayersForTeams, 
  fetchExistingAttendance,
  PlayerWithAttendance 
} from '@/utils/attendanceHelpers';

export type { PlayerWithAttendance } from '@/utils/attendanceHelpers';

export const useAttendanceData = (eventId: string, teamIds: string[], isOpen: boolean) => {
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!teamIds?.length || !isOpen) return;

    console.log('🔄 Starting fresh data fetch for teams:', teamIds);
    setLoading(true);
    setError(null);

    try {
      // Fetch players using the centralized helper
      const { players: playersData } = await fetchPlayersForTeams(teamIds);

      if (!playersData?.length) {
        setPlayers([]);
        setError('No approved players found for the selected teams');
        return;
      }

      const playerIds = playersData.map(p => p.id);

      // Fetch existing attendance
      const existingAttendance = await fetchExistingAttendance(eventId, playerIds);
      const attendanceMap = new Map(existingAttendance.map(att => [att.player_id, att]));

      // Transform data with attendance information
      const transformedPlayers: PlayerWithAttendance[] = playersData.map(player => {
        const existingRecord = attendanceMap.get(player.id);

        return {
          ...player,
          status: (existingRecord?.status as any) || 'present',
          notes: existingRecord?.notes || '',
          hasExistingRecord: !!existingRecord
        };
      });

      console.log(`✅ Successfully processed ${transformedPlayers.length} players`);
      setPlayers(transformedPlayers);

      if (transformedPlayers.length === 0) {
        setError('No approved players found for the selected teams');
      }

    } catch (error: any) {
      console.error('💥 Error fetching attendance data:', error);
      setError(`Failed to load data: ${error.message}`);
      toast({
        title: "Error Loading Data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, teamIds, isOpen, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      setPlayers([]);
      setError(null);
    }
  }, [isOpen, fetchData]);

  const updatePlayerStatus = useCallback((playerId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, status } : player
    ));
  }, []);

  const updatePlayerNotes = useCallback((playerId: string, notes: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, notes } : player
    ));
  }, []);

  const updateBulkStatus = useCallback((playerIds: string[], status: 'present' | 'absent' | 'late' | 'excused') => {
    setPlayers(prev => prev.map(player => 
      playerIds.includes(player.id) ? { ...player, status } : player
    ));
  }, []);

  return {
    players,
    loading,
    error,
    refetch: fetchData,
    updatePlayerStatus,
    updatePlayerNotes,
    updateBulkStatus,
  };
};