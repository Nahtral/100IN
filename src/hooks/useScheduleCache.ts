import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface ScheduleEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  opponent?: string;
  description?: string;
  team_ids?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  recurrence_end_date?: string;
  recurrence_pattern?: string;
  recurrence_days_of_week?: number[];
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

export const useScheduleCache = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry<ScheduleEvent[]>>>(new Map());
  const subscriptionRef = useRef<any>(null);

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Fetch events with caching
  const fetchEvents = useCallback(async (filters?: any) => {
    const cacheKey = `events_${JSON.stringify(filters || {})}`;
    const cache = cacheRef.current;
    const entry = cache.get(cacheKey);
    
    // Check cache first
    if (entry && Date.now() <= entry.expiry) {
      setEvents(entry.data);
      setLoading(false);
      return entry.data;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('schedules')
        .select('*')
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      const eventData = data || [];
      
      // Cache the result
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      
      cache.set(cacheKey, {
        data: eventData,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      });
      
      setEvents(eventData);
      return eventData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    subscriptionRef.current = supabase
      .channel('schedule_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        () => {
          invalidateCache();
          fetchEvents().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [fetchEvents, invalidateCache]);

  // Initial fetch
  useEffect(() => {
    fetchEvents().catch(console.error);
  }, [fetchEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      invalidateCache();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [invalidateCache]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    invalidateCache,
    refetch: () => fetchEvents()
  };
};