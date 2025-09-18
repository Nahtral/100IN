import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MembershipType {
  id: string;
  name: string;
  allocation_type: 'CLASS_COUNT' | 'UNLIMITED' | 'DATE_RANGE';
  class_count: number;
  start_date_required: boolean;
  end_date_required: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlayerMembership {
  id: string;
  player_id: string;
  membership_type_id: string;
  start_date: string;
  end_date: string | null;
  override_class_count: number | null;
  remaining_classes: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  auto_deactivate_when_used_up: boolean;
  manual_override_active: boolean;
  notes: string | null;
  membership_types?: MembershipType;
}

export interface MembershipSummary {
  membership_id: string;
  allocated_classes: number | null;
  used_classes: number;
  remaining_classes: number | null;
  status: string;
  type: string;
  days_left: number | null;
  should_deactivate: boolean;
  is_expired: boolean;
  start_date: string;
  end_date: string | null;
  allocation_type: string;
}

export const useMembershipSummary = (playerId: string) => {
  const [summary, setSummary] = useState<MembershipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSummary = async () => {
    if (!playerId || playerId.trim() === '') {
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('fn_get_membership_summary', { target_player_id: playerId });

      if (error) throw error;
      setSummary(data as unknown as MembershipSummary);
    } catch (error) {
      console.error('Error fetching membership summary:', error);
      toast({
        title: "Error",
        description: "Failed to load membership information",
        variant: "destructive",
      });
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [playerId]);

  return { summary, loading, refetch: fetchSummary };
};

export const useMembershipTypes = () => {
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('membership_types')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        
        // Map allocated_classes to class_count for consistency
        const mappedData = (data || []).map(type => ({
          id: type.id,
          name: type.name,
          allocation_type: type.allocation_type as 'CLASS_COUNT' | 'UNLIMITED' | 'DATE_RANGE',
          class_count: type.allocated_classes || type.class_count || 0,
          start_date_required: type.start_date_required,
          end_date_required: type.end_date_required,
          is_active: type.is_active,
          created_at: type.created_at,
          updated_at: type.updated_at
        })) as MembershipType[];
        
        setTypes(mappedData);
      } catch (error) {
        console.error('Error fetching membership types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  return { types, loading };
};

export const useAssignMembership = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const assignMembership = async (membership: {
    player_id: string;
    membership_type_id: string;
    start_date: string;
    end_date?: string;
    override_class_count?: number;
    auto_deactivate_when_used_up?: boolean;
    notes?: string;
  }): Promise<string | false> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_assign_membership', {
        p_player_id: membership.player_id,
        p_membership_type_id: membership.membership_type_id,
        p_start_date: membership.start_date,
        p_end_date: membership.end_date || null,
        p_override_class_count: membership.override_class_count || null,
        p_auto_deactivate_when_used_up: membership.auto_deactivate_when_used_up ?? true,
        p_notes: membership.notes || null
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Membership assigned successfully - remaining classes initialized automatically",
      });

      return data as string;
    } catch (error: any) {
      console.error('Error assigning membership:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to assign membership",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { assignMembership, loading };
};

export const useToggleOverride = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleOverride = async (membershipId: string, active: boolean) => {
    setLoading(true);
    try {
      // Note: Direct updates are blocked by RLS, would need an RPC for this
      toast({
        title: "Info", 
        description: "Manual override functionality requires system admin",
        variant: "default",
      });
      return false;
    } catch (error) {
      console.error('Error toggling override:', error);
      toast({
        title: "Error",
        description: "Failed to update override setting",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { toggleOverride, loading };
};

export const useActivatePlayer = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const activatePlayer = async (playerId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          is_active: true, 
          deactivation_reason: null 
        })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player activated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error activating player:', error);
      toast({
        title: "Error",
        description: "Failed to activate player",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deactivatePlayer = async (playerId: string, reason: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          is_active: false, 
          deactivation_reason: reason 
        })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player deactivated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deactivating player:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate player",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { activatePlayer, deactivatePlayer, loading };
};

export const useSendMembershipReminder = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendReminder = async (playerId: string, alertCode: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('membership-maintenance', {
        body: { 
          action: 'send_reminder',
          player_id: playerId,
          alert_code: alertCode
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder sent successfully",
      });

      return true;
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { sendReminder, loading };
};