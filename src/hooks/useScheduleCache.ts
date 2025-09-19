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
  status?: string | null;
  image_url?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
}

interface ScheduleFilters {
  event_type?: string;
  team_ids?: string[];
  location?: string;
  search?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

interface PaginationConfig {
  page: number;
  limit: number;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500; // Increased for production scale
const DEFAULT_PAGE_SIZE = 20;

export const useScheduleCache = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry<{events: ScheduleEvent[], count: number}>>>(new Map());
  const subscriptionRef = useRef<any>(null);
  const lastRequestRef = useRef<string>('');

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Enhanced fetch with filters and pagination
  const fetchEvents = useCallback(async (
    filters?: ScheduleFilters, 
    pagination?: PaginationConfig
  ) => {
    const requestKey = JSON.stringify({ filters, pagination });
    
    // Debounce rapid successive requests
    if (lastRequestRef.current === requestKey) {
      return { events, count: totalCount };
    }
    lastRequestRef.current = requestKey;

    const cacheKey = `events_${requestKey}`;
    const cache = cacheRef.current;
    const entry = cache.get(cacheKey);
    
    // Check cache first
    if (entry && Date.now() <= entry.expiry) {
      setEvents(entry.data.events);
      setTotalCount(entry.data.count);
      setLoading(false);
      return entry.data;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query with filters
      let query = supabase
        .from('schedules')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      
      if (filters?.team_ids && filters.team_ids.length > 0) {
        query = query.overlaps('team_ids', filters.team_ids);
      }
      
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,opponent.ilike.%${filters.search}%`);
      }
      
      if (filters?.date_range) {
        query = query
          .gte('start_time', filters.date_range.start)
          .lte('start_time', filters.date_range.end);
      }

      // Don't apply default sorting in cache - let the component handle it
      // This allows different tabs to have different sorting logic

      // Apply pagination
      if (pagination) {
        const from = (pagination.page - 1) * pagination.limit;
        const to = from + pagination.limit - 1;
        query = query.range(from, to);
      }

      // Default order by start time (component will re-sort as needed)
      query = query.order('start_time', { ascending: true });

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const eventData = data || [];
      const totalCount = count || 0;
      
      // Smart cache management
      if (cache.size >= MAX_CACHE_SIZE) {
        // Remove oldest 20% of entries
        const keysToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
        const sortedKeys = Array.from(cache.keys()).sort((a, b) => {
          const entryA = cache.get(a);
          const entryB = cache.get(b);
          return (entryA?.timestamp || 0) - (entryB?.timestamp || 0);
        });
        
        for (let i = 0; i < keysToRemove && i < sortedKeys.length; i++) {
          cache.delete(sortedKeys[i]);
        }
      }
      
      cache.set(cacheKey, {
        data: { events: eventData, count: totalCount },
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      });
      
      setEvents(eventData);
      setTotalCount(totalCount);
      return { events: eventData, count: totalCount };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [events, totalCount]);

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
    totalCount,
    loading,
    error,
    fetchEvents,
    invalidateCache,
    refetch: (filters?: ScheduleFilters, pagination?: PaginationConfig) => fetchEvents(filters, pagination)
  };
};