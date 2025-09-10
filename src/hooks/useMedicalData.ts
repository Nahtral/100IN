import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useRetryableQuery';

interface MedicalData {
  appointments: any[];
  rehabilitationPlans: any[];
  returnToPlayStatus: {
    status: 'cleared' | 'limited' | 'under_review' | 'not_cleared';
    lastAssessment: Date | null;
    activeInjuries: number;
    completedRehabPlans: number;
    totalRehabPlans: number;
    notes: string;
  };
}

interface UseMedicalDataProps {
  userRole: string;
  playerProfile?: any;
}

export const useMedicalData = ({ userRole, playerProfile }: UseMedicalDataProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalData, setData] = useState<MedicalData>({
    appointments: [],
    rehabilitationPlans: [],
    returnToPlayStatus: {
      status: 'cleared',
      lastAssessment: null,
      activeInjuries: 0,
      completedRehabPlans: 0,
      totalRehabPlans: 0,
      notes: ''
    }
  });
  const [internalError, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      let query = supabase
        .from('medical_appointments')
        .select(`
          *,
          players!inner (
            profiles (
              full_name,
              email
            )
          )
        `)
        .order('appointment_date', { ascending: true });

      if (userRole === 'player' && playerProfile) {
        query = query.eq('player_id', playerProfile.id);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      return appointments || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }, [userRole, playerProfile]);

  const fetchRehabilitationPlans = useCallback(async () => {
    try {
      let query = supabase
        .from('rehabilitation_plans')
        .select(`
          *,
          players!inner (
            profiles (
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'player' && playerProfile) {
        query = query.eq('player_id', playerProfile.id);
      }

      const { data: plans, error } = await query;
      if (error) throw error;

      return plans || [];
    } catch (error) {
      console.error('Error fetching rehabilitation plans:', error);
      return [];
    }
  }, [userRole, playerProfile]);

  const fetchReturnToPlayStatus = useCallback(async () => {
    try {
      const playerId = playerProfile?.id;
      if (!playerId) {
        return {
          status: 'cleared' as const,
          lastAssessment: null,
          activeInjuries: 0,
          completedRehabPlans: 0,
          totalRehabPlans: 0,
          notes: 'No player profile available'
        };
      }

      // Get active injuries
      const { data: injuries, error: injuryError } = await supabase
        .from('health_wellness')
        .select('injury_status, injury_description, medical_notes')
        .eq('player_id', playerId)
        .eq('injury_status', 'injured')
        .order('date', { ascending: false });

      if (injuryError) throw injuryError;

      // Get rehabilitation plan stats
      const { data: rehabStats, error: rehabError } = await supabase
        .from('rehabilitation_plans')
        .select('status')
        .eq('player_id', playerId);

      if (rehabError) throw rehabError;

      // Get last medical appointment
      const { data: lastAppointment, error: appointmentError } = await supabase
        .from('medical_appointments')
        .select('appointment_date, outcome, notes')
        .eq('player_id', playerId)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false })
        .limit(1);

      if (appointmentError) throw appointmentError;

      const activeInjuries = injuries?.length || 0;
      const completedRehabPlans = rehabStats?.filter(p => p.status === 'completed').length || 0;
      const totalRehabPlans = rehabStats?.length || 0;
      const activeRehabPlans = rehabStats?.filter(p => p.status === 'active').length || 0;

      // Determine return-to-play status
      let status: 'cleared' | 'limited' | 'under_review' | 'not_cleared';
      let notes = '';

      if (activeInjuries > 0) {
        status = 'not_cleared';
        notes = `${activeInjuries} active injury(ies) require medical clearance`;
      } else if (activeRehabPlans > 0) {
        status = 'limited';
        notes = `${activeRehabPlans} active rehabilitation plan(s) in progress`;
      } else if (totalRehabPlans > 0 && completedRehabPlans === totalRehabPlans) {
        status = 'cleared';
        notes = 'All rehabilitation completed, cleared for full activity';
      } else {
        status = 'cleared';
        notes = 'No active injuries or rehabilitation plans';
      }

      return {
        status,
        lastAssessment: lastAppointment?.[0]?.appointment_date ? new Date(lastAppointment[0].appointment_date) : null,
        activeInjuries,
        completedRehabPlans,
        totalRehabPlans,
        notes
      };
    } catch (error) {
      console.error('Error fetching return-to-play status:', error);
      return {
        status: 'under_review' as const,
        lastAssessment: null,
        activeInjuries: 0,
        completedRehabPlans: 0,
        totalRehabPlans: 0,
        notes: 'Unable to determine status - please consult medical staff'
      };
    }
  }, [playerProfile]);

  const fetchAllData = useCallback(async () => {
    const [appointments, rehabilitationPlans, returnToPlayStatus] = await Promise.all([
      fetchAppointments(),
      fetchRehabilitationPlans(),
      fetchReturnToPlayStatus()
    ]);

    return {
      appointments,
      rehabilitationPlans,
      returnToPlayStatus
    };
  }, [fetchAppointments, fetchRehabilitationPlans, fetchReturnToPlayStatus]);

  // Use retryable query for better error handling
  const {
    data,
    loading,
    error,
    retry,
    retryCount
  } = useSupabaseQuery({
    queryFn: fetchAllData,
    enabled: true,
    staleTime: 60000, // 1 minute
    onSuccess: (newData) => {
      setData(newData);
      setError(null);
    },
    onError: (err) => {
      setError('Failed to load medical data');
      console.error('Medical data fetch error:', err);
    }
  });

  const refreshData = useCallback(() => {
    retry();
  }, [retry]);

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    if (playerProfile?.id) {
      // Subscribe to appointments changes
      const appointmentsChannel = supabase
        .channel('medical_appointments_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'medical_appointments',
            filter: `player_id=eq.${playerProfile.id}`
          },
          () => refreshData()
        );

      // Subscribe to rehabilitation plans changes
      const rehabChannel = supabase
        .channel('rehabilitation_plans_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rehabilitation_plans',
            filter: `player_id=eq.${playerProfile.id}`
          },
          () => refreshData()
        );

      // Subscribe to health wellness changes (for injury status)
      const healthChannel = supabase
        .channel('health_wellness_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'health_wellness',
            filter: `player_id=eq.${playerProfile.id}`
          },
          () => refreshData()
        );

      channels.push(appointmentsChannel, rehabChannel, healthChannel);
      
      appointmentsChannel.subscribe();
      rehabChannel.subscribe();
      healthChannel.subscribe();
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [playerProfile?.id, refreshData]);

  return {
    data: data || internalData,
    loading,
    error: error || internalError,
    refreshData,
    retryCount
  };
};