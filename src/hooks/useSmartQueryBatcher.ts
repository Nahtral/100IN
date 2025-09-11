import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RequestBatcher } from '@/utils/requestBatcher';

interface SmartQuery {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  cacheTTL?: number;
}

interface BatchedResult<T = any> {
  data: T[];
  error: Error | null;
  fromCache: boolean;
  executionTime: number;
}

export const useSmartQueryBatcher = () => {
  const queryCache = useRef(new Map<string, { data: any; timestamp: number; ttl: number }>());
  const pendingQueries = useRef(new Map<string, Promise<any>>());

  // Cleanup cache periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of queryCache.current.entries()) {
        if (now > entry.timestamp + entry.ttl) {
          queryCache.current.delete(key);
        }
      }
    }, 60000); // Cleanup every minute

    return () => clearInterval(cleanup);
  }, []);

  // Generate cache key for query
  const generateCacheKey = useCallback((query: SmartQuery): string => {
    return `${query.table}-${query.select || '*'}-${JSON.stringify(query.filters || {})}`;
  }, []);

  // Execute single optimized query
  const executeQuery = useCallback(async <T = any>(query: SmartQuery): Promise<BatchedResult<T>> => {
    const startTime = performance.now();
    const cacheKey = generateCacheKey(query);
    const cacheTTL = query.cacheTTL || 300000; // 5 minutes default

    // Check cache first
    const cached = queryCache.current.get(cacheKey);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return {
        data: cached.data,
        error: null,
        fromCache: true,
        executionTime: performance.now() - startTime
      };
    }

    // Check if query is already pending
    if (pendingQueries.current.has(cacheKey)) {
      const result = await pendingQueries.current.get(cacheKey);
      return {
        data: result,
        error: null,
        fromCache: false,
        executionTime: performance.now() - startTime
      };
    }

    // Execute query
    const queryPromise = (async () => {
      try {
        let supabaseQuery = (supabase as any).from(query.table);
        
        if (query.select) {
          supabaseQuery = supabaseQuery.select(query.select);
        } else {
          supabaseQuery = supabaseQuery.select('*');
        }

        // Apply filters intelligently
        if (query.filters) {
          Object.entries(query.filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              supabaseQuery = supabaseQuery.in(key, value);
            } else if (value && typeof value === 'object' && 'gte' in value) {
              supabaseQuery = supabaseQuery.gte(key, value.gte);
            } else if (value && typeof value === 'object' && 'lte' in value) {
              supabaseQuery = supabaseQuery.lte(key, value.lte);
            } else if (value && typeof value === 'object' && 'like' in value) {
              supabaseQuery = supabaseQuery.ilike(key, `%${value.like}%`);
            } else {
              supabaseQuery = supabaseQuery.eq(key, value);
            }
          });
        }

        const { data, error } = await supabaseQuery;
        
        if (error) throw error;

        // Cache successful results
        queryCache.current.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL
        });

        return data;
      } finally {
        pendingQueries.current.delete(cacheKey);
      }
    })();

    pendingQueries.current.set(cacheKey, queryPromise);
    
    try {
      const data = await queryPromise;
      return {
        data,
        error: null,
        fromCache: false,
        executionTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        data: [],
        error: error as Error,
        fromCache: false,
        executionTime: performance.now() - startTime
      };
    }
  }, [generateCacheKey]);

  // Execute multiple queries with intelligent batching
  const batchExecute = useCallback(async (queries: SmartQuery[]): Promise<BatchedResult[]> => {
    const startTime = performance.now();
    
    // Separate cached and non-cached queries
    const cachedResults: BatchedResult[] = [];
    const uncachedQueries: SmartQuery[] = [];
    const uncachedIndexes: number[] = [];

    queries.forEach((query, index) => {
      const cacheKey = generateCacheKey(query);
      const cached = queryCache.current.get(cacheKey);
      
      if (cached && Date.now() < cached.timestamp + cached.ttl) {
        cachedResults[index] = {
          data: cached.data,
          error: null,
          fromCache: true,
          executionTime: 0
        };
      } else {
        uncachedQueries.push(query);
        uncachedIndexes.push(index);
      }
    });

    // Execute uncached queries in parallel with priority batching
    const highPriorityQueries = uncachedQueries.filter(q => q.priority === 'high');
    const normalPriorityQueries = uncachedQueries.filter(q => q.priority !== 'high' && q.priority !== 'low');
    const lowPriorityQueries = uncachedQueries.filter(q => q.priority === 'low');

    const executeQueryBatch = async (queryBatch: SmartQuery[], batchIndexes: number[]) => {
      const results = await Promise.allSettled(
        queryBatch.map(query => executeQuery(query))
      );

      results.forEach((result, i) => {
        const originalIndex = batchIndexes[i];
        if (result.status === 'fulfilled') {
          cachedResults[originalIndex] = result.value;
        } else {
          cachedResults[originalIndex] = {
            data: [],
            error: new Error(result.reason?.message || 'Query failed'),
            fromCache: false,
            executionTime: performance.now() - startTime
          };
        }
      });
    };

    // Execute in priority order
    const highPriorityIndexes = uncachedIndexes.filter((_, i) => uncachedQueries[i].priority === 'high');
    const normalPriorityIndexes = uncachedIndexes.filter((_, i) => 
      uncachedQueries[i].priority !== 'high' && uncachedQueries[i].priority !== 'low'
    );
    const lowPriorityIndexes = uncachedIndexes.filter((_, i) => uncachedQueries[i].priority === 'low');

    // Execute high priority first
    if (highPriorityQueries.length > 0) {
      await executeQueryBatch(highPriorityQueries, highPriorityIndexes);
    }

    // Then normal and low priority in parallel
    await Promise.all([
      normalPriorityQueries.length > 0 ? executeQueryBatch(normalPriorityQueries, normalPriorityIndexes) : Promise.resolve(),
      lowPriorityQueries.length > 0 ? executeQueryBatch(lowPriorityQueries, lowPriorityIndexes) : Promise.resolve()
    ]);

    return cachedResults;
  }, [executeQuery, generateCacheKey]);

  // Prefetch queries based on predicted usage
  const prefetchQueries = useCallback(async (queries: SmartQuery[]) => {
    // Execute with low priority to avoid blocking user interactions
    const prefetchQueries = queries.map(q => ({ ...q, priority: 'low' as const }));
    await batchExecute(prefetchQueries);
  }, [batchExecute]);

  // Invalidate cache for specific patterns
  const invalidateCache = useCallback((pattern?: string | RegExp) => {
    if (!pattern) {
      queryCache.current.clear();
      return;
    }

    const keys = Array.from(queryCache.current.keys());
    if (typeof pattern === 'string') {
      keys.forEach(key => {
        if (key.includes(pattern)) {
          queryCache.current.delete(key);
        }
      });
    } else {
      keys.forEach(key => {
        if (pattern.test(key)) {
          queryCache.current.delete(key);
        }
      });
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [_, entry] of queryCache.current.entries()) {
      if (now < entry.timestamp + entry.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: queryCache.current.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries || 1)
    };
  }, []);

  return {
    executeQuery,
    batchExecute,
    prefetchQueries,
    invalidateCache,
    getCacheStats
  };
};