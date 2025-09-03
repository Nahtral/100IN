// Performance optimization utilities
export class PerformanceOptimizer {
  private static pendingRequests = new Map<string, Promise<any>>();
  private static requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  // Debounce functions to prevent excessive calls
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle functions to limit call frequency
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Prevent duplicate requests
  static async dedupeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Check cache first
    const cached = this.requestCache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    
    try {
      const result = await promise;
      // Cache successful results
      this.requestCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: 300000 // 5 minutes
      });
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  // Memory efficient intersection observer
  static createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      root: options?.root ?? null,
      rootMargin: options?.rootMargin ?? '50px',
      threshold: options?.threshold ?? 0.1
    });
  }

  // Cleanup function for memory management
  static cleanup() {
    // Clear expired cache entries
    const now = Date.now();
    for (const [key, entry] of this.requestCache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.requestCache.delete(key);
      }
    }
  }
}

// Auto cleanup every 10 minutes
setInterval(() => PerformanceOptimizer.cleanup(), 600000);