import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlayerDataState {
  attendance: any[];
  grades: any[];
  healthCheckIns: any[];
  shots: any[];
  membershipUsage: any;
  loading: boolean;
  error: string | null;
}

export const useRealTimePlayerData = (playerId?: string) => {
  const [data, setData] = useState<PlayerDataState>({
    attendance: [],
    grades: [],
    healthCheckIns: [],
    shots: [],
    membershipUsage: null,
    loading: true,
    error: null
  });
  
  const { toast } = useToast();

  const fetchAllPlayerData = useCallback(async () => {
    if (!playerId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel for better performance
      const [attendanceRes, gradesRes, healthRes, shotsRes, membershipRes] = await Promise.all([
        // Attendance data
        supabase
          .from('attendance')
          .select(`
            *,
            schedules!event_id(title, start_time, event_type)
          `)
          .eq('player_id', playerId)
          .order('recorded_at', { ascending: false })
          .limit(20),

        // Grades data
        supabase
          .from('event_player_grades')
          .select(`
            *,
            schedules!schedule_id(title, start_time, event_type)
          `)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Health check-ins
        supabase
          .from('daily_health_checkins')
          .select('*')
          .eq('player_id', playerId)
          .order('check_in_date', { ascending: false })
          .limit(30),

        // Shot data
        supabase
          .from('shots')
          .select('*')
          .eq('player_id', playerId)
          .order('created_at', { ascending: false })
          .limit(100),

        // Membership usage
        supabase
          .rpc('fn_get_membership_summary', { target_player_id: playerId })
      ]);

      // Check for errors
      const errors = [attendanceRes.error, gradesRes.error, healthRes.error, shotsRes.error, membershipRes.error].filter(Boolean);
      if (errors.length > 0) {
        console.error('Data fetch errors:', errors);
        throw new Error(`Failed to fetch some data: ${errors.map(e => e?.message).join(', ')}`);
      }

      setData({
        attendance: attendanceRes.data || [],
        grades: gradesRes.data || [],
        healthCheckIns: healthRes.data || [],
        shots: shotsRes.data || [],
        membershipUsage: membershipRes.data,
        loading: false,
        error: null
      });

    } catch (error: any) {
      console.error('Error fetching player data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load player data'
      }));
      
      toast({
        title: "Data Load Error",
        description: "Some player data may not be available",
        variant: "destructive"
      });
    }
  }, [playerId, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!playerId) return;

    fetchAllPlayerData();

    // Subscribe to real-time changes
    const channels = [
      supabase
        .channel(`player-attendance-${playerId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `player_id=eq.${playerId}`
        }, () => {
          fetchAllPlayerData();
        })
        .subscribe(),

      supabase
        .channel(`player-grades-${playerId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_player_grades',
          filter: `player_id=eq.${playerId}`
        }, () => {
          fetchAllPlayerData();
        })
        .subscribe(),

      supabase
        .channel(`health-checkins-${playerId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'daily_health_checkins',
          filter: `player_id=eq.${playerId}`
        }, () => {
          fetchAllPlayerData();
        })
        .subscribe(),

      supabase
        .channel(`shots-${playerId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'shots',
          filter: `player_id=eq.${playerId}`
        }, () => {
          fetchAllPlayerData();
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [playerId, fetchAllPlayerData]);

  return {
    ...data,
    refetch: fetchAllPlayerData
  };
};