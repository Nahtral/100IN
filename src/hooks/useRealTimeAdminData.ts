import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminDataState {
  totalPlayers: number;
  activeTeams: number;
  todayAttendance: number;
  pendingApprovals: number;
  recentActivities: any[];
  systemHealth: any;
  loading: boolean;
  error: string | null;
}

export const useRealTimeAdminData = () => {
  const [data, setData] = useState<AdminDataState>({
    totalPlayers: 0,
    activeTeams: 0,
    todayAttendance: 0,
    pendingApprovals: 0,
    recentActivities: [],
    systemHealth: null,
    loading: true,
    error: null
  });
  
  const { toast } = useToast();

  const fetchAdminData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date().toISOString().split('T')[0];

      // Fetch all admin dashboard data in parallel
      const [
        playersRes,
        teamsRes,
        attendanceRes,
        approvalsRes,
        activitiesRes,
        healthRes
      ] = await Promise.all([
        // Total active players
        supabase
          .from('players')
          .select('id', { count: 'exact' })
          .eq('is_active', true),

        // Active teams
        supabase
          .from('teams')
          .select('id', { count: 'exact' })
          .eq('is_active', true),

        // Today's attendance
        supabase
          .from('attendance')
          .select('id', { count: 'exact' })
          .eq('status', 'present')
          .gte('recorded_at', `${today}T00:00:00Z`)
          .lte('recorded_at', `${today}T23:59:59Z`),

        // Pending user approvals
        supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('approval_status', 'pending'),

        // Recent activities (last 20)
        supabase
          .from('analytics_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),

        // System health check
        supabase.rpc('rpc_dashboard_health')
      ]);

      // Check for errors
      const errors = [
        playersRes.error,
        teamsRes.error,
        attendanceRes.error,
        approvalsRes.error,
        activitiesRes.error,
        healthRes.error
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('Admin data fetch errors:', errors);
        throw new Error(`Failed to fetch some admin data: ${errors.map(e => e?.message).join(', ')}`);
      }

      setData({
        totalPlayers: playersRes.count || 0,
        activeTeams: teamsRes.count || 0,
        todayAttendance: attendanceRes.count || 0,
        pendingApprovals: approvalsRes.count || 0,
        recentActivities: activitiesRes.data || [],
        systemHealth: healthRes.data,
        loading: false,
        error: null
      });

    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load admin data'
      }));
      
      toast({
        title: "Admin Data Error",
        description: "Some dashboard data may not be available",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Set up real-time subscriptions for admin data
  useEffect(() => {
    fetchAdminData();

    // Subscribe to changes in key tables
    const channels = [
      supabase
        .channel('admin-players-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'players'
        }, () => {
          fetchAdminData();
        })
        .subscribe(),

      supabase
        .channel('admin-attendance-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'attendance'
        }, () => {
          fetchAdminData();
        })
        .subscribe(),

      supabase
        .channel('admin-profiles-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, () => {
          fetchAdminData();
        })
        .subscribe(),

      supabase
        .channel('admin-activities-changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events'
        }, () => {
          fetchAdminData();
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchAdminData]);

  return {
    ...data,
    refetch: fetchAdminData
  };
};