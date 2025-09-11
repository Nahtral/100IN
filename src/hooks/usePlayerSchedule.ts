import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location?: string;
  opponent?: string;
  description?: string;
  status: string;
}

interface UsePlayerScheduleReturn {
  events: ScheduleEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerSchedule = (teamId?: string): UsePlayerScheduleReturn => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      let query = supabase
        .from('schedules')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .eq('status', 'active')
        .order('start_time', { ascending: true })
        .limit(10);

      // Filter by team if teamId is provided
      if (teamId) {
        query = query.contains('team_ids', [teamId]);
      }

      const { data, error: queryError } = await Promise.race([
        query,
        timeoutPromise
      ]) as any;

      if (queryError) {
        throw queryError;
      }

      setEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();

    // Set up real-time subscription for schedule updates
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        () => {
          // Refetch on any schedule changes
          fetchSchedule();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  return {
    events,
    loading,
    error,
    refetch: fetchSchedule
  };
};