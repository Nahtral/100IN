import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBatchedQueries } from '@/hooks/useBatchedQueries';
import { useToast } from '@/hooks/use-toast';

interface BatchedDashboardData {
  stats: {
    totalUsers: number;
    totalPlayers: number;
    totalTeams: number;
    upcomingEvents: number;
    revenue: number;
    pendingTasks: number;
  } | null;
  loading: boolean;
  error: string | null;
}

export const useBatchedDashboard = (userRole: string | null) => {
  const [data, setData] = useState<BatchedDashboardData>({
    stats: null,
    loading: true,
    error: null
  });
  
  const { batchFetch, batchCount } = useBatchedQueries();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userRole) return;

      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Get current user for role-based data access
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        if (userRole === 'super_admin') {
          // Batch count queries for super admin
          const counts = await batchCount([
            'profiles',
            'players', 
            'teams',
            'schedules',
            'notifications'
          ]);

          // Single batched query for revenue data
          const [paymentsData] = await batchFetch([
            {
              table: 'payments',
              select: 'amount',
              filters: { 
                payment_status: 'completed'
              }
            }
          ]);

          const revenue = paymentsData.reduce((sum: number, payment: any) => 
            sum + parseFloat(payment.amount || 0), 0
          );

          setData({
            stats: {
              totalUsers: counts.profiles || 0,
              totalPlayers: counts.players || 0,
              totalTeams: counts.teams || 0,
              upcomingEvents: counts.schedules || 0,
              revenue,
              pendingTasks: counts.notifications || 0
            },
            loading: false,
            error: null
          });
        } else {
          // Limited data for regular users
          const [userTeams] = await batchFetch([
            {
              table: 'players',
              select: 'team_id',
              filters: { 
                user_id: user.id,
                is_active: true
              }
            }
          ]);

          setData({
            stats: {
              totalUsers: 0,
              totalPlayers: userTeams.length,
              totalTeams: new Set(userTeams.map((p: any) => p.team_id)).size,
              upcomingEvents: 0,
              revenue: 0,
              pendingTasks: 0
            },
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        setData({
          stats: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load dashboard data'
        });
        
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchDashboardData();
  }, [userRole, batchFetch, batchCount, toast]);

  return data;
};