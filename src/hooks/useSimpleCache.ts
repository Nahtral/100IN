import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export const useSimpleCache = <T = any>(defaultTTL: number = 5 * 60 * 1000) => {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    
    if (entry) {
      cacheRef.current.delete(key);
    }
    
    return null;
  }, []);

  const set = useCallback((key: string, data: T, ttl: number = defaultTTL): void => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    
    cacheRef.current.set(key, entry);
  }, [defaultTTL]);

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

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    get,
    set,
    invalidate,
    clear,
    size: () => cacheRef.current.size
  };
};