import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MembershipUsage {
  player_id: string;
  credits_remaining: number;
  has_active_membership: boolean;
}

interface AttendanceSummary {
  player_id: string;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
}

export const usePlayerMembershipUpdated = (playerId?: string) => {
  const [membershipUsage, setMembershipUsage] = useState<MembershipUsage | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch membership usage
  const fetchMembershipUsage = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('v_player_membership_usage')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) throw error;
      setMembershipUsage(data);
    } catch (error: any) {
      console.error('Error fetching membership usage:', error);
      // Don't show toast for missing data - it's optional
      setMembershipUsage(null);
    }
  }, [playerId]);

  // Fetch attendance summary
  const fetchAttendanceSummary = useCallback(async () => {
    if (!playerId) return;

    try {
      const { data, error } = await supabase
        .from('v_player_attendance_summary')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) throw error;
      setAttendanceSummary(data);
    } catch (error: any) {
      console.error('Error fetching attendance summary:', error);
      setAttendanceSummary(null);
    }
  }, [playerId]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchMembershipUsage(),
      fetchAttendanceSummary()
    ]);
    setLoading(false);
  }, [fetchMembershipUsage, fetchAttendanceSummary]);

  // Subscribe to real-time membership changes
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase
      .channel('membership-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_memberships',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          // Refetch data when membership changes
          fetchMembershipUsage();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          // Refetch data when attendance changes
          fetchAttendanceSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, fetchMembershipUsage, fetchAttendanceSummary]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    membershipUsage,
    attendanceSummary,
    loading,
    refetch: fetchData
  };
};