import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BatchedQuery {
  table: string;
  select?: string;
  filters?: Record<string, any>;
}

export const useBatchedQueries = () => {
  const batchFetch = useCallback(async (queries: BatchedQuery[]) => {
    try {
      // Execute queries in parallel
      const results = await Promise.all(
        queries.map(async (query) => {
          let supabaseQuery = (supabase as any).from(query.table);
          
          if (query.select) {
            supabaseQuery = supabaseQuery.select(query.select);
          } else {
            supabaseQuery = supabaseQuery.select('*');
          }

          // Apply filters
          if (query.filters) {
            Object.entries(query.filters).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                supabaseQuery = supabaseQuery.in(key, value);
              } else {
                supabaseQuery = supabaseQuery.eq(key, value);
              }
            });
          }

          const { data, error } = await supabaseQuery;
          if (error) throw error;
          return data;
        })
      );

      return results;
    } catch (error) {
      console.error('Batch query failed:', error);
      throw error;
    }
  }, []);

  const batchCount = useCallback(async (tables: string[]) => {
    try {
      const results = await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await (supabase as any)
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          return { table, count: count || 0 };
        })
      );

      return results.reduce((acc, { table, count }) => {
        acc[table] = count;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error('Batch count failed:', error);
      throw error;
    }
  }, []);

  return { batchFetch, batchCount };
};