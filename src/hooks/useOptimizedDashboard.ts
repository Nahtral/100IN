import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceOptimizer } from '@/utils/performanceOptimizer';
import { OptimizedCache } from '@/hooks/useOptimizedCache';
import { useUserRole } from '@/hooks/useUserRole';

interface OptimizedDashboardData {
  stats: any;
  loading: boolean;
  error: string | null;
}

const CACHE_KEYS = {
  DASHBOARD: 'dashboard-optimized',
  USER_STATS: 'user-stats',
  SYSTEM_ALERTS: 'system-alerts'
} as const;

export const useOptimizedDashboard = () => {
  const [data, setData] = useState<OptimizedDashboardData>({
    stats: null,
    loading: true,
    error: null
  });
  const { isSuperAdmin, userRole, loading: roleLoading } = useUserRole();

  const fetchDashboardData = useCallback(async () => {
    if (roleLoading) return;

    const cacheKey = `${CACHE_KEYS.DASHBOARD}_${userRole || 'guest'}`;
    
    try {
      const result = await PerformanceOptimizer.dedupeRequest(
        cacheKey,
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // Fetch minimal essential data based on role
          if (isSuperAdmin) {
            // Super admin gets comprehensive stats
            const [usersCount, teamsCount, alertsCount] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }),
              supabase.from('teams').select('*', { count: 'exact', head: true }),
              supabase.from('system_alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false)
            ]);

            return {
              totalUsers: usersCount.count || 0,
              totalTeams: teamsCount.count || 0,
              pendingAlerts: alertsCount.count || 0,
              role: 'super_admin'
            };
          } else {
            // Regular users get limited stats
            const [userTeams] = await Promise.all([
              supabase.from('players').select('team_id').eq('user_id', user.id).eq('is_active', true)
            ]);

            return {
              userTeams: userTeams.data?.length || 0,
              role: userRole || 'user'
            };
          }
        }
      );

      setData({
        stats: result,
        loading: false,
        error: null
      });
    } catch (error) {
      setData({
        stats: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      });
    }
  }, [isSuperAdmin, userRole, roleLoading]);

  const debouncedFetch = useMemo(
    () => PerformanceOptimizer.debounce(fetchDashboardData, 300),
    [fetchDashboardData]
  );

  useEffect(() => {
    if (!roleLoading) {
      debouncedFetch();
    }
  }, [debouncedFetch, roleLoading]);

  return data;
};