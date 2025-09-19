import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MembershipSummaryV2 {
  membership_id: string;
  user_id: string;
  player_name: string;
  allocated_classes: number;
  used_classes: number;
  remaining_classes: number;
  start_date: string;
  end_date: string | null;
  status: string;
  membership_type_name: string;
  allocation_type: string;
  days_left: number | null;
  should_deactivate: boolean;
  is_expired: boolean;
}

export interface MembershipTypeV2 {
  id: string;
  name: string;
  description?: string;
  allocated_classes: number | null;
  allocation_type: string;
  price?: number;
  currency?: string;
  duration_days?: number | null;
  is_active: boolean;
}

// Hook to get membership summary using user_id (aligned with attendance system)
export const useMembershipSummaryV2 = (userId?: string) => {
  const [membership, setMembership] = useState<MembershipSummaryV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMembership = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: membershipError } = await supabase
        .rpc('fn_get_membership_summary_v2', { target_user_id: userId });

      if (membershipError) {
        throw membershipError;
      }

      setMembership(data ? data as unknown as MembershipSummaryV2 : null);
    } catch (err: any) {
      console.error('Error fetching membership:', err);
      setError(err.message || 'Failed to load membership data');
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

// Hook to get membership types
export const useMembershipTypesV2 = () => {
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeV2[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembershipTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('membership_types')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setMembershipTypes((data || []) as MembershipTypeV2[]);
      } catch (error) {
        console.error('Error fetching membership types:', error);
        setMembershipTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipTypes();
  }, []);

  return { membershipTypes, loading };
};

// Hook to assign membership using new v2 schema
export const useAssignMembershipV2 = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const assignMembership = useCallback(async (params: {
    userId: string;
    membershipTypeId: string;
    startDate: string;
    endDate?: string;
    overrideClassCount?: number;
    autoDeactivate?: boolean;
    notes?: string;
  }) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('rpc_assign_membership_v2', {
        p_user_id: params.userId,
        p_membership_type_id: params.membershipTypeId,
        p_start_date: params.startDate,
        p_end_date: params.endDate || null,
        p_override_class_count: params.overrideClassCount || null,
        p_auto_deactivate: params.autoDeactivate ?? true,
        p_notes: params.notes || null
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Membership assigned successfully",
        description: "The membership has been assigned to the user.",
      });

      return { success: true, membershipId: data };
    } catch (err: any) {
      console.error('Error assigning membership:', err);
      const errorMessage = err.message || 'Failed to assign membership';
      
      toast({
        title: "Failed to assign membership", 
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { assignMembership, loading };
};

// Hook for membership transactions (audit trail)
export const useMembershipTransactions = (userId?: string) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_transactions')
        .select(`
          *,
          membership:membership_id (
            membership_type:membership_type_id (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    refetch: fetchTransactions
  };
};