import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalUsers?: number;
  totalPlayers?: number;
  totalTeams?: number;
  upcomingEvents?: number;
  revenue?: number;
  pendingTasks?: number;
  userTeams?: number;
  role?: string;
}

interface RobustDashboardData {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  errorCode?: string;
  retryCount: number;
  lastUpdated?: Date;
}

const MAX_RETRIES = 2;
const TIMEOUT_MS = 8000;
const RETRY_DELAY = 1000;

export const useRobustDashboard = (userRole: string | null, userId: string | null) => {
  const [data, setData] = useState<RobustDashboardData>({
    stats: null,
    loading: true,
    error: null,
    retryCount: 0,
  });
  
  const { toast } = useToast();

  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('rpc_dashboard_health');
      
      if (error) {
        console.error('Health check failed:', error);
        return false;
      }
      
      const healthData = data as { status?: string };
      return healthData?.status === 'healthy';
    } catch (error) {
      console.error('Health check exception:', error);
      return false;
    }
  }, []);

  const fetchDashboardData = useCallback(async (retryAttempt = 0): Promise<void> => {
    if (!userRole || !userId) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Missing user role or ID',
        errorCode: 'MISSING_USER_DATA'
      }));
      return;
    }

    setData(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      retryCount: retryAttempt 
    }));

    // Set timeout for entire operation
    const timeoutId = setTimeout(() => {
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Request timeout - please try again',
        errorCode: 'TIMEOUT'
      }));
    }, TIMEOUT_MS);

    try {
      // Quick health check first
      const isHealthy = await healthCheck();
      if (!isHealthy && retryAttempt === 0) {
        throw new Error('Database health check failed');
      }

      let stats: DashboardStats = { role: userRole };

      if (userRole === 'super_admin') {
        // Fetch admin stats
        const [usersResult, playersResult, teamsResult, schedulesResult, paymentsResult] = await Promise.all([
          supabase.from('user_roles_simple').select('*', { count: 'exact', head: true }),
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('schedules').select('*', { count: 'exact', head: true }),
          supabase.from('payments').select('amount').eq('payment_status', 'completed')
        ]);

        const revenue = paymentsResult.data?.reduce((sum: number, payment: any) => 
          sum + parseFloat(payment.amount || 0), 0) || 0;

        stats = {
          totalUsers: usersResult.count || 0,
          totalPlayers: playersResult.count || 0,
          totalTeams: teamsResult.count || 0,
          upcomingEvents: schedulesResult.count || 0,
          revenue,
          pendingTasks: 0,
          role: userRole
        };
      } else {
        // Fetch limited user stats
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        stats = {
          userTeams: teamMemberships?.length || 0,
          role: userRole
        };
      }

      clearTimeout(timeoutId);
      
      setData({
        stats,
        loading: false,
        error: null,
        retryCount: retryAttempt,
        lastUpdated: new Date()
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Dashboard data fetch error:', error);
      
      const errorMessage = error?.message || 'Failed to load dashboard data';
      const errorCode = error?.code || 'FETCH_ERROR';
      
      // Retry logic with exponential backoff
      if (retryAttempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryAttempt);
        console.log(`Retrying dashboard fetch in ${delay}ms (attempt ${retryAttempt + 1}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          fetchDashboardData(retryAttempt + 1);
        }, delay);
        
        return;
      }

      // Final failure - set error state
      setData({
        stats: null,
        loading: false,
        error: errorMessage,
        errorCode,
        retryCount: retryAttempt
      });

      // Show user-friendly error toast
      toast({
        title: "Dashboard Error",
        description: `${errorMessage}${errorCode ? ` (${errorCode})` : ''}`,
        variant: "destructive",
      });
    }
  }, [userRole, userId, healthCheck, toast]);

  const retry = useCallback(() => {
    fetchDashboardData(0);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (userRole && userId) {
      fetchDashboardData(0);
    }
  }, [userRole, userId, fetchDashboardData]);

  return {
    ...data,
    retry,
    isRetrying: data.loading && data.retryCount > 0,
    canRetry: !data.loading && data.error !== null,
    healthCheck
  };
};