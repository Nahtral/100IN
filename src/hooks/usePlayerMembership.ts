import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MembershipSummary } from '@/hooks/useMembership';

interface UsePlayerMembershipReturn {
  membership: MembershipSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerMembership = (playerId?: string): UsePlayerMembershipReturn => {
  const [membership, setMembership] = useState<MembershipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMembership = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get membership summary using the existing RPC function
      const { data, error: membershipError } = await supabase
        .rpc('fn_get_membership_summary', { target_player_id: playerId });

      if (membershipError) {
        throw membershipError;
      }

      setMembership(data as unknown as MembershipSummary);

    } catch (err: any) {
      console.error('Error fetching membership:', err);
      setError(err.message || 'Failed to load membership data');
      
      // Don't show toast for membership errors as it's optional data
      console.warn('Membership data not available for player:', playerId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, [playerId]);

  return {
    membership,
    loading,
    error,
    refetch: fetchMembership
  };
};