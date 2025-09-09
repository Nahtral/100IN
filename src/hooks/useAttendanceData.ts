import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlayerWithAttendance {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  full_name: string;
  email: string;
  phone?: string;
  team_name: string;
  team_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  hasExistingRecord: boolean;
}

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
      // Step 1: Get player-team relationships
      const { data: playerTeams, error: ptError } = await supabase
        .from('player_teams')
        .select('player_id, team_id')
        .in('team_id', teamIds)
        .eq('is_active', true);

      console.log('🔍 Player-team relationships:', { playerTeams, ptError });

      if (ptError) throw ptError;
      if (!playerTeams?.length) {
        setPlayers([]);
        setError('No players assigned to the selected teams');
        return;
      }

      const playerIds = [...new Set(playerTeams.map(pt => pt.player_id))];

      // Step 2: Get player details
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, user_id, jersey_number, position')
        .in('id', playerIds)
        .eq('is_active', true);

      console.log('🏀 Players data:', { playersData, playersError });

      if (playersError) throw playersError;
      if (!playersData?.length) {
        setPlayers([]);
        setError('No active players found');
        return;
      }

      const userIds = playersData.map(p => p.user_id);

      // Step 3: Get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, approval_status')
        .in('id', userIds)
        .eq('approval_status', 'approved');

      console.log('👤 Profiles data:', { profilesData, profilesError });

      if (profilesError) throw profilesError;
      if (!profilesData?.length) {
        setPlayers([]);
        setError('No approved player profiles found');
        return;
      }

      // Step 4: Get team names
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds)
        .eq('is_active', true);

      console.log('🏆 Teams data:', { teamsData, teamsError });

      if (teamsError) throw teamsError;

      // Step 5: Get existing attendance
      const { data: existingAttendance, error: attendanceError } = await supabase
        .from('player_attendance')
        .select('player_id, status, notes')
        .eq('schedule_id', eventId)
        .in('player_id', playerIds);

      console.log('📝 Existing attendance:', { existingAttendance, attendanceError });

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      }

      // Build lookup maps
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      const teamsMap = new Map((teamsData || []).map(t => [t.id, t.name]));
      const playerTeamMap = new Map(playerTeams.map(pt => [pt.player_id, pt.team_id]));
      const attendanceMap = new Map((existingAttendance || []).map(att => [att.player_id, att]));

      // Transform data
      const transformedPlayers: PlayerWithAttendance[] = playersData
        .filter(player => profilesMap.has(player.user_id))
        .map(player => {
          const profile = profilesMap.get(player.user_id)!;
          const teamId = playerTeamMap.get(player.id) || '';
          const existingRecord = attendanceMap.get(player.id);

          return {
            id: player.id,
            user_id: player.user_id,
            jersey_number: player.jersey_number || undefined,
            position: player.position || undefined,
            full_name: profile.full_name || 'Unknown Player',
            email: profile.email || '',
            phone: profile.phone || undefined,
            team_name: teamsMap.get(teamId) || 'Unknown Team',
            team_id: teamId,
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