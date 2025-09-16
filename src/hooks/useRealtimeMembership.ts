import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MembershipData {
  membership_id: string;
  player_id: string;
  player_name: string;
  allocated_classes: number;
  used_classes: number;
  remaining_classes: number;
  status: string;
  membership_type_name: string;
  days_left: number | null;
  should_deactivate: boolean;
  is_expired: boolean;
  start_date: string;
  end_date: string | null;
  allocation_type: string;
}

export const useRealtimeMembership = (playerId?: string) => {
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembership = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

const { data, error: membershipError } = await supabase
  .from('vw_player_membership_usage_secure')
  .select('*')
  .eq('player_id', playerId)
  .order('start_date', { ascending: false })
  .limit(1)
  .maybeSingle();

if (membershipError) {
  throw membershipError;
}

const typedData: MembershipData | null = data ? {
  membership_id: data.membership_id || '',
  player_id: data.player_id || '',
  player_name: data.player_name || '',
  allocated_classes: data.allocated_classes || 0,
  used_classes: data.used_classes || 0,
  remaining_classes: data.remaining_classes || 0,
  status: data.status || 'INACTIVE',
  membership_type_name: data.membership_type_name || '',
  days_left: data.days_left || null,
  should_deactivate: data.should_deactivate || false,
  is_expired: data.is_expired || false,
  start_date: data.start_date || '',
  end_date: data.end_date || null,
  allocation_type: data.allocation_type || ''
} : null;

setMembership(typedData);
    } catch (err: any) {
      console.error('Error fetching membership:', err);
      setError(err.message || 'Failed to load membership data');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  // Real-time subscription for membership changes
  useEffect(() => {
    if (!playerId) return;

    const membershipChannel = supabase
      .channel(`membership-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_memberships',
          filter: `player_id=eq.${playerId}`
        },
        () => {
          fetchMembership();
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
          fetchMembership();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membershipChannel);
    };
  }, [playerId, fetchMembership]);

  // Initial fetch
  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  return {
    membership,
    loading,
    error,
    refetch: fetchMembership
  };
};