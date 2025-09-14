import { useState, useEffect, useCallback } from 'react';
import { fetchPlayersForTeams, fetchExistingAttendance, PlayerWithAttendance } from '@/utils/attendanceHelpers';

// Export type for use in other components
export type { PlayerWithAttendance };

export const useAttendanceData = (eventId: string, teamIds: string[], isOpen: boolean) => {
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isOpen || !teamIds?.length || !eventId) {
      setPlayers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch players for the given teams
      const { players: playersData } = await fetchPlayersForTeams(teamIds);
      
      if (playersData.length === 0) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const playerIds = playersData.map(p => p.id);

      // Fetch existing attendance
      const existingAttendance = await fetchExistingAttendance(eventId, playerIds);
      
      // Create attendance status map from existing records
      const attendanceMap = new Map<string, { status: string; notes: string }>();
      existingAttendance.forEach((record: any) => {
        attendanceMap.set(record.player_id, {
          status: record.status,
          notes: record.notes || ''
        });
      });

      // Merge players with their attendance status
      const updatedPlayers = playersData.map(player => {
        const attendance = attendanceMap.get(player.id);
        return {
          ...player,
          status: (attendance?.status as 'present' | 'absent' | 'late' | 'excused') || 'absent',
          notes: attendance?.notes || '',
          hasExistingRecord: !!attendance
        };
      });

      setPlayers(updatedPlayers);
    } catch (err: any) {
      console.error('Error fetching attendance data:', err);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [eventId, teamIds, isOpen]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    updateBulkStatus
  };
};