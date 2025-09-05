import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Player {
  id: string;
  full_name: string;
  email: string;
  latest_tryout_total?: number;
  latest_tryout_placement?: 'Gold' | 'Black' | 'White';
  latest_tryout_date?: string;
}

export interface TryoutEvaluation {
  id: string;
  player_id: string;
  ball_handling: number;
  shooting: number;
  defense: number;
  iq: number;
  athleticism: number;
  total: number;
  placement: 'Gold' | 'Black' | 'White';
  notes?: string;
  event_name: string;
  created_at: string;
  player_name?: string;
  evaluator_name?: string;
}

export interface EvaluationFormData {
  ball_handling: number;
  shooting: number;
  defense: number;
  iq: number;
  athleticism: number;
  notes: string;
  event_name: string;
}

export const useTryoutEvaluations = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlayers = useCallback(async (searchTerm: string = '') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_approved_players', {
        search_term: searchTerm
      });

      if (error) throw error;
      return data as Player[] || [];
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch players. Please try again.',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchEvaluations = useCallback(async (limit: number = 25) => {
    try {
      // Fetch evaluations
      const { data: evaluationsData, error } = await supabase
        .from('tryout_evaluations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      if (!evaluationsData || evaluationsData.length === 0) {
        return [];
      }

      // Get unique player and evaluator IDs
      const playerIds = [...new Set(evaluationsData.map(e => e.player_id))];
      const evaluatorIds = [...new Set(evaluationsData.map(e => e.evaluator_id))];
      
      // Fetch player names
      const { data: playersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', playerIds);
      
      // Fetch evaluator names  
      const { data: evaluatorsData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', evaluatorIds);

      // Create lookup maps
      const playersMap = new Map((playersData || []).map(p => [p.id, p.full_name]));
      const evaluatorsMap = new Map((evaluatorsData || []).map(e => [e.id, e.full_name]));
      
      // Combine data
      const formattedData = evaluationsData.map(evaluation => ({
        ...evaluation,
        player_name: playersMap.get(evaluation.player_id) || 'Unknown Player',
        evaluator_name: evaluatorsMap.get(evaluation.evaluator_id) || 'Unknown Evaluator'
      }));
      
      return formattedData as TryoutEvaluation[];
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch evaluations. Please try again.',
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  const saveEvaluation = useCallback(async (
    playerId: string,
    formData: EvaluationFormData,
    existingEvaluationId?: string
  ) => {
    try {
      setSaving(true);
      
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const evaluationData = {
        player_id: playerId,
        evaluator_id: user.data.user.id,
        ball_handling: formData.ball_handling,
        shooting: formData.shooting,
        defense: formData.defense,
        iq: formData.iq,
        athleticism: formData.athleticism,
        notes: formData.notes || null,
        event_name: formData.event_name
      };

      let result;
      if (existingEvaluationId) {
        // Update existing evaluation
        result = await supabase
          .from('tryout_evaluations')
          .update(evaluationData)
          .eq('id', existingEvaluationId);
      } else {
        // Insert new evaluation
        result = await supabase
          .from('tryout_evaluations')
          .insert([evaluationData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Evaluation ${existingEvaluationId ? 'updated' : 'saved'} successfully!`,
      });

      return true;
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save evaluation. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const exportEvaluations = useCallback(async (filters?: {
    startDate?: string;
    endDate?: string;
    evaluatorId?: string;
    placement?: string;
    eventName?: string;
  }) => {
    try {
      const { data, error } = await supabase.rpc('export_tryout_evaluations', {
        start_date: filters?.startDate || null,
        end_date: filters?.endDate || null,
        evaluator_filter: filters?.evaluatorId || null,
        placement_filter: filters?.placement || null,
        event_filter: filters?.eventName || null
      });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No evaluations found to export.',
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error exporting evaluations:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  return {
    loading,
    saving,
    fetchPlayers,
    fetchEvaluations,
    saveEvaluation,
    exportEvaluations
  };
};