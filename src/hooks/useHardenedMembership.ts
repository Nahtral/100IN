import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MembershipData {
  membership_id: string;
  player_id: string;
  allocated_classes: number;
  used_classes: number;
  remaining_classes: number;
  days_left: number | null;
  should_deactivate: boolean;
  is_expired: boolean;
  start_date: string;
  end_date: string | null;
  player_name: string;
  status: string;
  membership_type_name: string;
  allocation_type: string;
}

export const useHardenedMembership = (playerId?: string) => {
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

      setMembership(data);
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
      .channel(`hardened-membership-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_memberships',
          filter: `player_id=eq.${playerId}`
        },
        () => {
          console.log('Membership updated, refetching...');
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
          console.log('Membership ledger updated, refetching...');
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