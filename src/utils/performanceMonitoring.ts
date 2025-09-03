interface PerformanceEntry extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export class PerformanceMonitoring {
  private static metrics: Record<string, number> = {};
  private static observers: PerformanceObserver[] = [];

  static initialize() {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    // Observe performance entries
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(`${entry.entryType}_${entry.name}`, entry.duration || entry.startTime);
        }
      });
      
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.debug('Performance observer not supported:', error);
    }

    // Track memory usage periodically (reduced frequency to prevent overhead)
    if ('memory' in performance) {
      const memoryInterval = setInterval(() => {
        const memory = (performance as PerformanceEntry).memory;
        if (memory) {
          this.recordMetric('memory_used_heap', memory.usedJSHeapSize);
          this.recordMetric('memory_total_heap', memory.totalJSHeapSize);
        }
      }, 60000); // Reduced to every 60 seconds
      
      // Store interval for cleanup
      this.observers.push({ disconnect: () => clearInterval(memoryInterval) } as any);
    }

    // Track route changes
    let currentPath = window.location.pathname;
    const checkRouteChange = () => {
      if (window.location.pathname !== currentPath) {
        this.recordMetric('route_change', performance.now());
        currentPath = window.location.pathname;
      }
    };
    
    // Use both popstate and interval for route change detection (reduced frequency)
    window.addEventListener('popstate', checkRouteChange);
    const routeInterval = setInterval(checkRouteChange, 5000); // Reduced to every 5 seconds
    
    // Store interval for cleanup
    this.observers.push({ disconnect: () => clearInterval(routeInterval) } as any);
  }

  static recordMetric(name: string, value: number) {
    this.metrics[name] = value;
    
    // Log significant performance issues
    if (name.includes('duration') && value > 3000) {
      console.warn(`Slow operation detected: ${name} took ${value}ms`);
    }
  }

  static getMetrics() {
    return { ...this.metrics };
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(`async_${name}`, duration);
    });
  }

  static measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(`sync_${name}`, duration);
    }
  }

  static cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Initialize monitoring when module is loaded
if (typeof window !== 'undefined') {
  PerformanceMonitoring.initialize();
}