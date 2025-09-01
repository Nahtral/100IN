import { useState, useEffect, useMemo } from 'react';
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

  const memoizedFetch = useMemo(() => {
    let abortController: AbortController | null = null;
    
    return async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cancel previous request if still pending
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();

        // Get current user with timeout
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth request timeout')), 10000)
        );
        
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any;
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Check if user is super admin or staff (can see all data)
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .abortSignal(abortController.signal);

        if (rolesError && rolesError.name !== 'AbortError') throw rolesError;

        const isSuperAdmin = userRoles?.some(ur => ur.role === 'super_admin');
        const isStaff = userRoles?.some(ur => ur.role === 'staff');
        const canSeeAllData = isSuperAdmin || isStaff;

        // Get user's team(s) if they are a player
        let userTeamIds: string[] = [];
        if (!canSeeAllData) {
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('team_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .abortSignal(abortController.signal);
          
          if (playerError && playerError.name !== 'AbortError') throw playerError;
          if (playerData && playerData.length > 0) {
            userTeamIds = playerData.map(p => p.team_id).filter(Boolean);
          }
        }

        // Fetch data based on permissions with proper error handling
        let usersResult, playersResult, teamsResult, performanceResult, schedulesResult, paymentsResult, alertsResult;

        if (canSeeAllData) {
          // Super admin and staff can see all data
          const promises = [
            supabase.from('profiles').select('id', { count: 'exact', head: true }).abortSignal(abortController.signal),
            supabase.from('players').select('*', { count: 'exact', head: true }).abortSignal(abortController.signal),
            supabase.from('teams').select('*', { count: 'exact', head: true }).abortSignal(abortController.signal),
            supabase.from('player_performance').select('*', { count: 'exact', head: true }).abortSignal(abortController.signal),
            supabase.from('schedules').select('*').gte('start_time', new Date().toISOString()).abortSignal(abortController.signal),
            supabase.from('payments')
              .select('amount')
              .eq('payment_status', 'completed')
              .gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString())
              .abortSignal(abortController.signal),
            supabase.from('system_alerts')
              .select('*', { count: 'exact', head: true })
              .eq('is_resolved', false)
              .abortSignal(abortController.signal)
          ];

          const results = await Promise.allSettled(promises);
          [usersResult, playersResult, teamsResult, performanceResult, schedulesResult, paymentsResult, alertsResult] = 
            results.map(result => result.status === 'fulfilled' ? result.value : { count: 0, data: [] });
        } else {
          // Regular users only see data for their teams
          if (userTeamIds.length > 0) {
            const promises = [
              supabase.from('players').select('*', { count: 'exact', head: true }).in('team_id', userTeamIds).abortSignal(abortController.signal),
              supabase.from('teams').select('*', { count: 'exact', head: true }).in('id', userTeamIds).abortSignal(abortController.signal),
              supabase.from('schedules').select('*').gte('start_time', new Date().toISOString()).overlaps('team_ids', userTeamIds).abortSignal(abortController.signal)
            ];

            const results = await Promise.allSettled(promises);
            [playersResult, teamsResult, schedulesResult] = 
              results.map(result => result.status === 'fulfilled' ? result.value : { count: 0, data: [] });
          } else {
            // User is not on any team, return empty results
            playersResult = { count: 0 };
            teamsResult = { count: 0 };
            schedulesResult = { data: [] };
          }
          
          // Set other counts to 0 for regular users
          usersResult = { count: 0 };
          performanceResult = { count: 0 };
          paymentsResult = { data: [] };
          alertsResult = { count: 0 };
        }

        const totalUsers = usersResult?.count || 0;
        const totalPlayers = playersResult?.count || 0;
        const totalTeams = teamsResult?.count || 0;
        const totalGames = performanceResult?.count || 0;
        const upcomingEvents = schedulesResult?.data?.length || 0;
        
        // Calculate real revenue from payments
        const revenue = paymentsResult?.data?.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0) || 0;
        
        // Get real system alerts count
        const systemAlerts = alertsResult?.count || 0;

        setStats({
          totalUsers,
          totalPlayers,
          totalTeams,
          totalGames,
          activeUsers: Math.floor(totalUsers * 0.7), // Estimate active users
          pendingTasks: systemAlerts, // Use alerts as pending tasks
          revenue,
          upcomingEvents
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching dashboard data:', err);
          setError('Failed to fetch dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    memoizedFetch();
  }, [memoizedFetch]);

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
          query = query.contains('team_ids', [teamId]);
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
            .select('*, profiles(full_name)')  // Only fetch non-sensitive profile data
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