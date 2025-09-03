import { useEffect, useRef } from 'react';
import { RateLimiter } from '@/utils/rateLimiter';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class OptimizedCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static maxSize = 1000;
  
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  static set<T>(key: string, data: T, ttl = 300000): void {
    // Prevent cache overflow
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }
  
  static clear(): void {
    this.cache.clear();
  }
  
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export function useOptimizedCache() {
  const cleanupRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Cleanup expired entries every 10 minutes
    cleanupRef.current = setInterval(() => {
      OptimizedCache.cleanup();
    }, 600000);
    
    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
    };
  }, []);
  
  return {
    get: OptimizedCache.get,
    set: OptimizedCache.set,
    clear: OptimizedCache.clear
  };
}