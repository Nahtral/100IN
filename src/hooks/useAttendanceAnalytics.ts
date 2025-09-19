import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceMetrics {
  totalEvents: number;
  averageAttendance: number;
  weeklyTrends: Array<{ week: string; attendance: number; events: number }>;
  monthlyTrends: Array<{ month: string; attendance: number; events: number }>;
  playerAttendance: Array<{
    playerId: string;
    playerName: string;
    attendanceRate: number;
    totalEvents: number;
    presentCount: number;
  }>;
  teamComparison: Array<{
    teamId: string;
    teamName: string;
    attendanceRate: number;
    totalPlayers: number;
  }>;
  loading: boolean;
  error: string | null;
}

export const useAttendanceAnalytics = (timeframeDays: number = 30) => {
  const [metrics, setMetrics] = useState<AttendanceMetrics>({
    totalEvents: 0,
    averageAttendance: 0,
    weeklyTrends: [],
    monthlyTrends: [],
    playerAttendance: [],
    teamComparison: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setMetrics(prev => ({ ...prev, loading: true, error: null }));

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframeDays);

        // Fetch attendance records with schedule info
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            id,
            status,
            recorded_at,
            player_id,
            team_id,
            event_id,
            schedules!inner(
              id,
              title,
              start_time,
              event_type
            )
          `)
          .gte('recorded_at', startDate.toISOString());

        if (attendanceError) throw attendanceError;

        // Get player names separately
        const playerIds = [...new Set(attendanceData?.map(a => a.player_id))];
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select(`
            id,
            user_id,
            profiles!inner(
              full_name
            )
          `)
          .in('id', playerIds);

        if (playersError) throw playersError;

        // Create player lookup map
        const playerLookup = new Map();
        playersData?.forEach(player => {
          playerLookup.set(player.id, player.profiles.full_name);
        });

        // Process weekly trends
        const weeklyMap = new Map();
        const monthlyMap = new Map();
        const playerMap = new Map();
        const teamMap = new Map();

        attendanceData?.forEach(record => {
          const recordDate = new Date(record.schedules.start_time);
          
          // Weekly trends
          const weekStart = new Date(recordDate);
          weekStart.setDate(recordDate.getDate() - recordDate.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { total: 0, present: 0, events: new Set() });
          }
          const weekData = weeklyMap.get(weekKey);
          weekData.total++;
          weekData.events.add(record.event_id);
          if (record.status === 'present') weekData.present++;

          // Monthly trends
          const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth() + 1}`;
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { total: 0, present: 0, events: new Set() });
          }
          const monthData = monthlyMap.get(monthKey);
          monthData.total++;
          monthData.events.add(record.event_id);
          if (record.status === 'present') monthData.present++;

          // Player attendance
          const playerId = record.player_id;
          const playerName = playerLookup.get(playerId) || `Player ${playerId.slice(0, 8)}`;
          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, { 
              name: playerName, 
              total: 0, 
              present: 0 
            });
          }
          const playerData = playerMap.get(playerId);
          playerData.total++;
          if (record.status === 'present') playerData.present++;

          // Team comparison
          if (record.team_id) {
            if (!teamMap.has(record.team_id)) {
              teamMap.set(record.team_id, { 
                total: 0, 
                present: 0, 
                players: new Set() 
              });
            }
            const teamData = teamMap.get(record.team_id);
            teamData.total++;
            teamData.players.add(playerId);
            if (record.status === 'present') teamData.present++;
          }
        });

        // Convert maps to arrays
        const weeklyTrends = Array.from(weeklyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-8)
          .map(([week, data], index) => ({
            week: `Week ${index + 1}`,
            attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            events: data.events.size
          }));

        const monthlyTrends = Array.from(monthlyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, data]) => {
            const [year, monthNum] = month.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return {
              month: monthNames[parseInt(monthNum) - 1],
              attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
              events: data.events.size
            };
          });

        const playerAttendance = Array.from(playerMap.entries())
          .map(([playerId, data]) => ({
            playerId,
            playerName: data.name,
            attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            totalEvents: data.total,
            presentCount: data.present
          }))
          .sort((a, b) => b.attendanceRate - a.attendanceRate);

        const teamComparison = Array.from(teamMap.entries())
          .map(([teamId, data]) => ({
            teamId,
            teamName: `Team ${teamId.slice(0, 8)}`, // Simplified team name
            attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            totalPlayers: data.players.size
          }))
          .sort((a, b) => b.attendanceRate - a.attendanceRate);

        const totalEvents = new Set(attendanceData?.map(r => r.event_id)).size;
        const totalRecords = attendanceData?.length || 0;
        const presentRecords = attendanceData?.filter(r => r.status === 'present').length || 0;
        const averageAttendance = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

        setMetrics({
          totalEvents,
          averageAttendance,
          weeklyTrends,
          monthlyTrends,
          playerAttendance,
          teamComparison,
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error fetching attendance analytics:', error);
        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load attendance data',
        }));
      }
    };

    fetchAttendanceData();
  }, [timeframeDays]);

  return metrics;
};