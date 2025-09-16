import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GradeMetrics {
  [key: string]: {
    score: number;
    priority?: string;
  };
}

interface PlayerGrade {
  player_id: string;
  event_id: string;
  metrics: GradeMetrics;
  overall: number;
  created_at: string;
  updated_at: string;
}

export const useHardenedGrading = (eventId?: string, playerId?: string) => {
  const [grades, setGrades] = useState<PlayerGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    if (!eventId || !playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: gradeError } = await supabase
        .from('event_player_grades')
        .select('*')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (gradeError) {
        throw gradeError;
      }

      setGrades(data as any);
    } catch (err: any) {
      console.error('Error fetching grades:', err);
      setError(err.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, [eventId, playerId]);

  const saveGrades = useCallback(async (metrics: GradeMetrics): Promise<boolean> => {
    if (!eventId || !playerId) {
      toast.error('Missing event or player information');
      return false;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc('rpc_save_event_grades', {
        p_event_id: eventId,
        p_player_id: playerId,
        p_metrics: metrics
      });

      if (error) {
        console.error('Error saving grades:', error);
        toast.error(`Failed to save grades: ${error.message}`);
        return false;
      }

      const result = data as { success: boolean; overall: number; metrics_count: number };
      toast.success(`Grades saved! Overall: ${result.overall.toFixed(1)}`);
      
      // Refresh grades to show updated data
      await fetchGrades();
      
      return true;
    } catch (error: any) {
      console.error('Unexpected error saving grades:', error);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setSaving(false);
    }
  }, [eventId, playerId, fetchGrades]);

  // Real-time subscription for grade changes
  useEffect(() => {
    if (!eventId || !playerId) return;

    const gradesChannel = supabase
      .channel(`hardened-grades-${eventId}-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_player_grades',
          filter: `event_id=eq.${eventId} AND player_id=eq.${playerId}`
        },
        () => {
          console.log('Grades updated, refetching...');
          fetchGrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gradesChannel);
    };
  }, [eventId, playerId, fetchGrades]);

  // Initial fetch
  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  return {
    grades,
    loading,
    saving,
    error,
    saveGrades,
    refetch: fetchGrades
  };
};