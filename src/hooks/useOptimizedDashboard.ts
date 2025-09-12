import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { OptimizedCache } from '@/hooks/useOptimizedCache';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

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
  const { isSuperAdmin, primaryRole, loading: roleLoading } = useOptimizedAuth();

  const fetchDashboardData = useCallback(async () => {
    if (roleLoading) return;

    const cacheKey = `${CACHE_KEYS.DASHBOARD}_${primaryRole || 'guest'}`;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let result;
      
      // Fetch minimal essential data based on role
      if (isSuperAdmin) {
        // Super admin gets comprehensive stats
        const [usersCount, teamsCount, alertsCount] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('system_alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false)
        ]);

        result = {
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

        result = {
          userTeams: userTeams.data?.length || 0,
          role: primaryRole || 'user'
        };
      }

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
  }, [isSuperAdmin, primaryRole, roleLoading]);

  const debouncedFetch = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(fetchDashboardData, 300);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!roleLoading) {
      debouncedFetch();
    }
  }, [debouncedFetch, roleLoading]);

  return data;
};