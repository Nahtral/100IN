import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalUsers: number;
  totalPlayers: number;
  totalTeams: number;
  totalGames: number;
  activeUsers: number;
  pendingTasks: number;
  revenue: number;
  upcomingEvents: number;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch basic counts
        const [usersResult, playersResult, teamsResult, performanceResult, schedulesResult] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('player_performance').select('*', { count: 'exact', head: true }),
          supabase.from('schedules').select('*').gte('start_time', new Date().toISOString())
        ]);

        const totalUsers = usersResult.count || 0;
        const totalPlayers = playersResult.count || 0;
        const totalTeams = teamsResult.count || 0;
        const totalGames = performanceResult.count || 0;
        const upcomingEvents = schedulesResult.data?.length || 0;

        setStats({
          totalUsers,
          totalPlayers,
          totalTeams,
          totalGames,
          activeUsers: Math.floor(totalUsers * 0.7), // Estimate active users
          pendingTasks: 8, // This would come from a tasks table
          revenue: 52430, // This would come from a payments/revenue table
          upcomingEvents
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { stats, loading, error };
};

export const usePlayerPerformance = (playerId?: string) => {
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!playerId) return;
      
      try {
        const { data, error } = await supabase
          .from('player_performance')
          .select('*')
          .eq('player_id', playerId)
          .order('game_date', { ascending: false })
          .limit(5);

        if (error) throw error;
        setPerformance(data || []);
      } catch (err) {
        console.error('Error fetching player performance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [playerId]);

  return { performance, loading };
};

export const useUpcomingSchedule = (teamId?: string) => {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        let query = supabase
          .from('schedules')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (teamId) {
          query = query.eq('team_id', teamId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSchedule(data || []);
      } catch (err) {
        console.error('Error fetching schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [teamId]);

  return { schedule, loading };
};

export const useTeamData = (coachId?: string) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!coachId) return;

      try {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .eq('coach_id', coachId);

        if (teamsError) throw teamsError;

        if (teamsData && teamsData.length > 0) {
          const teamIds = teamsData.map(team => team.id);
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('*, profiles(full_name, email)')
            .in('team_id', teamIds);

          if (playersError) throw playersError;
          setPlayers(playersData || []);
        }

        setTeams(teamsData || []);
      } catch (err) {
        console.error('Error fetching team data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [coachId]);

  return { teams, players, loading };
};