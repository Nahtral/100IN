import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerGrade {
  id: string;
  overall: number;  // Using overall instead of overall_grade
  created_at: string;
  schedules?: {
    title: string;
    start_time: string;
  };
}

interface UsePlayerGradesReturn {
  grades: PlayerGrade[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerGrades = (playerId?: string): UsePlayerGradesReturn => {
  const [grades, setGrades] = useState<PlayerGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = async () => {
    if (!playerId) {
      setGrades([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('event_player_grades')
        .select(`
          id,
          overall,
          created_at,
          schedules!event_id(
            title,
            start_time
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setGrades(data || []);
    } catch (err: any) {
      console.error('Error fetching player grades:', err);
      setError(err.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();

    // Set up real-time subscription for grade updates
    if (playerId) {
      const channel = supabase
        .channel(`player-grades-${playerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_player_grades',
            filter: `player_id=eq.${playerId}`
          },
          () => {
            fetchGrades();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [playerId]);

  return {
    grades,
    loading,
    error,
    refetch: fetchGrades
  };
};