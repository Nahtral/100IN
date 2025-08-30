import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface RequestConfig {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  cacheKey?: string;
  ttl?: number; // Time to live in milliseconds
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const useRequestCache = <T = any>() => {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  const generateCacheKey = useCallback((config: RequestConfig): string => {
    if (config.cacheKey) return config.cacheKey;
    
    const filterKey = config.filters 
      ? Object.entries(config.filters).map(([k, v]) => `${k}=${v}`).join('&')
      : '';
    
    return `${config.table}:${config.select || '*'}:${filterKey}`;
  }, []);

  const isValid = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() < entry.expiry;
  }, []);

  const get = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (entry && isValid(entry)) {
      return entry.data;
    }
    
    // Remove expired entry
    if (entry) {
      cacheRef.current.delete(key);
    }
    
    return null;
  }, [isValid]);

  const set = useCallback((key: string, data: T, ttl: number = DEFAULT_TTL): void => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    
    cacheRef.current.set(key, entry);
  }, []);

  const invalidate = useCallback((pattern?: string): void => {
    if (!pattern) {
      cacheRef.current.clear();
      return;
    }

    const keysToDelete = Array.from(cacheRef.current.keys()).filter(key => 
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => cacheRef.current.delete(key));
  }, []);

  const fetchWithCache = useCallback(async (config: RequestConfig): Promise<T> => {
    const cacheKey = generateCacheKey(config);
    
    // Check cache first
    const cached = get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      // Wait for pending request to complete
      return new Promise((resolve, reject) => {
        const checkPending = () => {
          const cached = get(cacheKey);
          if (cached !== null) {
            resolve(cached);
          } else if (!pendingRequests.has(cacheKey)) {
            reject(new Error('Request failed'));
          } else {
            setTimeout(checkPending, 100);
          }
        };
        checkPending();
      });
    }

    // Mark as pending
    setPendingRequests(prev => new Set(prev).add(cacheKey));

    try {
      // Build query with proper types
      const table = config.table as keyof typeof supabase['from'];
      let queryBuilder = supabase.from(table);
      
      if (config.select) {
        queryBuilder = queryBuilder.select(config.select) as any;
      } else {
        queryBuilder = queryBuilder.select('*') as any;
      }

      // Apply filters
      if (config.filters) {
        Object.entries(config.filters).forEach(([key, value]) => {
          if (key.includes('gte.')) {
            const field = key.replace('gte.', '');
            queryBuilder = (queryBuilder as any).gte(field, value);
          } else if (key.includes('lt.')) {
            const field = key.replace('lt.', '');
            queryBuilder = (queryBuilder as any).lt(field, value);
          } else if (key.includes('eq.')) {
            const field = key.replace('eq.', '');
            queryBuilder = (queryBuilder as any).eq(field, value);
          } else {
            queryBuilder = (queryBuilder as any).eq(key, value);
          }
        });
      }

      const result = await queryBuilder as any;
      
      if (result.error) throw result.error;

      // Cache the result
      set(cacheKey, result.data as T, config.ttl);
      
      return result.data as T;
    } finally {
      // Remove from pending
      setPendingRequests(prev => {
        const next = new Set(prev);
        next.delete(cacheKey);
        return next;
      });
    }
  }, [generateCacheKey, get, set, pendingRequests]);

  const batchFetch = useCallback(async (configs: RequestConfig[]): Promise<T[]> => {
    const promises = configs.map(config => fetchWithCache(config));
    return Promise.all(promises);
  }, [fetchWithCache]);

  // Cleanup expired entries periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      cacheRef.current.forEach((entry, key) => {
        if (!isValid(entry)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => cacheRef.current.delete(key));
    };

    const interval = setInterval(cleanup, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [isValid]);

  return {
    fetchWithCache,
    batchFetch,
    get,
    set,
    invalidate,
    clearCache: () => cacheRef.current.clear(),
    getCacheSize: () => cacheRef.current.size
  };
};