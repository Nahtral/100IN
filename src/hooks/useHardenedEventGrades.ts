import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GradeMetrics {
  [key: string]: {
    score: number;
    priority?: number;
  };
}

interface PlayerGrade {
  player_id: string;
  event_id: string;
  metrics: GradeMetrics;
  overall_score: number;
  last_saved: string;
}

export const useHardenedEventGrades = (eventId?: string, playerId?: string) => {
  const [grades, setGrades] = useState<PlayerGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = async () => {
    if (!eventId) {
      setGrades([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('event_player_grades')
        .select('*')
        .eq('event_id', eventId);

      if (playerId) {
        query = query.eq('player_id', playerId);
      }

      const { data, error: queryError } = await query
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

// Transform the data to match our interface
const transformedGrades: PlayerGrade[] = (data || []).map(grade => ({
  player_id: grade.player_id,
  event_id: grade.event_id,
  metrics: (typeof grade.metrics === 'object' && grade.metrics !== null) ? grade.metrics as GradeMetrics : {},
  overall_score: grade.overall || 0,
  last_saved: grade.updated_at
}));

setGrades(transformedGrades);
    } catch (err: any) {
      console.error('Error fetching grades:', err);
      setError(err.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const saveGrades = async (playerId: string, updatedMetrics: GradeMetrics): Promise<boolean> => {
    if (!eventId || !playerId) return false;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('rpc_save_event_grades', {
        p_event_id: eventId,
        p_player_id: playerId,
        p_metrics: updatedMetrics
      });

      if (error) {
        throw error;
      }

      toast.success('Grades saved successfully');
      await fetchGrades(); // Refresh data
      return true;
    } catch (err: any) {
      console.error('Error saving grades:', err);
      toast.error(`Failed to save grades: ${err.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Real-time subscription for grade changes
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-grades-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_player_grades',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          console.log('Grades updated, refetching...');
          fetchGrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Initial fetch
  useEffect(() => {
    fetchGrades();
  }, [eventId, playerId]);

  return {
    grades,
    loading,
    saving,
    error,
    saveGrades,
    refetch: fetchGrades
  };
};