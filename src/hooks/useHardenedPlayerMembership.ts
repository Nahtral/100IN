import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MembershipUsage {
  player_id: string;
  allocated_classes: number;
  used_classes: number;
  remaining_classes: number;
  has_active_membership: boolean;
  membership_type_name: string;
  status: string;
}

interface AttendanceSummary {
  player_id: string;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  total_events: number;
}

export const useHardenedPlayerMembership = (playerId?: string) => {
  const [membershipUsage, setMembershipUsage] = useState<MembershipUsage | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch membership usage from the secure view
  const fetchMembershipUsage = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vw_player_membership_usage_secure')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) throw error;
      setMembershipUsage(data);
    } catch (error: any) {
      console.error('Error fetching membership usage:', error);
      setMembershipUsage(null);
    }
  }, [playerId]);

  // Fetch attendance summary from the new view
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
        () => {
          fetchMembershipUsage();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'membership_ledger',
          filter: `player_id=eq.${playerId}`
        },
        () => {
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
        () => {
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