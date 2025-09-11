// Enterprise-grade performance monitoring and optimization system
import { PerformanceOptimizer } from './performanceOptimizer';

interface PerformanceBudget {
  metric: string;
  budget: number;
  warning: number;
  current?: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  current: number;
  timestamp: number;
}

export class EnterprisePerformanceSystem {
  private static budgets: PerformanceBudget[] = [
    { metric: 'FCP', budget: 1500, warning: 1200 },
    { metric: 'LCP', budget: 2500, warning: 2000 },
    { metric: 'TTI', budget: 3000, warning: 2500 },
    { metric: 'TBT', budget: 200, warning: 150 },
    { metric: 'CLS', budget: 0.1, warning: 0.05 },
    { metric: 'bundle_size', budget: 500000, warning: 400000 }, // 500KB
    { metric: 'api_response_time', budget: 1000, warning: 800 }
  ];

  private static alerts: PerformanceAlert[] = [];
  private static observers: PerformanceObserver[] = [];

  // Initialize enterprise monitoring
  static initialize() {
    this.setupPerformanceObservers();
    this.setupResourceMonitoring();
    this.setupNetworkMonitoring();
    this.startBudgetMonitoring();
    this.registerServiceWorker();
  }

  // Setup comprehensive performance observers
  private static setupPerformanceObservers() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals observer
    const vitalsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        const perfEntry = entry as any; // Cast for Web Vitals API
        const value = perfEntry.value || perfEntry.duration || 0;
        this.checkBudget(entry.name, value);
        this.sendTelemetry({
          metric: entry.name,
          value: value,
          timestamp: Date.now(),
          url: window.location.href
        });
      });
    });

    try {
      vitalsObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
      this.observers.push(vitalsObserver);
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    // Long task observer for TBT calculation
    const longTaskObserver = new PerformanceObserver((list) => {
      const tbt = list.getEntries().reduce((total, entry) => {
        return total + Math.max(0, entry.duration - 50);
      }, 0);
      
      if (tbt > 0) {
        this.checkBudget('TBT', tbt);
      }
    });

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }
  }

  // Monitor resource loading performance
  private static setupResourceMonitoring() {
    if (typeof window === 'undefined') return;

    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.transferSize) {
          const size = entry.transferSize;
          const duration = entry.responseEnd - entry.requestStart;
          
          // Check for large resources
          if (size > 100000) { // 100KB
            this.createAlert('warning', 'large_resource', size, size, `Large resource: ${entry.name}`);
          }

          // Check for slow resources
          if (duration > 2000) { // 2s
            this.createAlert('warning', 'slow_resource', 2000, duration, `Slow resource: ${entry.name}`);
          }
        }
      });
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  // Monitor network performance and API calls
  private static setupNetworkMonitoring() {
    // Wrap fetch to monitor API performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.checkBudget('api_response_time', duration);
        this.sendTelemetry({
          metric: 'api_call',
          value: duration,
          timestamp: Date.now(),
          url: args[0]?.toString() || 'unknown',
          status: response.status
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.sendTelemetry({
          metric: 'api_error',
          value: duration,
          timestamp: Date.now(),
          url: args[0]?.toString() || 'unknown',
          error: error.message
        });
        throw error;
      }
    };
  }

  // Monitor performance budgets continuously
  private static startBudgetMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
      this.cleanupOldAlerts();
    }, 30000); // Check every 30 seconds
  }

  // Register service worker for offline functionality
  private static async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Enable background sync
        if ('sync' in (window as any).ServiceWorkerRegistration.prototype) {
          (registration as any).sync.register('background-sync');
        }
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // Check performance against budgets
  private static checkBudget(metric: string, value: number) {
    const budget = this.budgets.find(b => b.metric === metric);
    if (!budget) return;

    budget.current = value;

    if (value > budget.budget) {
      this.createAlert('critical', metric, budget.budget, value);
    } else if (value > budget.warning) {
      this.createAlert('warning', metric, budget.warning, value);
    }
  }

  // Create performance alert
  private static createAlert(type: 'warning' | 'critical', metric: string, threshold: number, current: number, message?: string) {
    const alert: PerformanceAlert = {
      id: `${metric}-${Date.now()}`,
      type,
      metric,
      threshold,
      current,
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    
    // Notify monitoring systems
    this.sendAlert(alert, message);
  }

  // Send alert to monitoring system
  private static sendAlert(alert: PerformanceAlert, message?: string) {
    console.warn(`Performance Alert [${alert.type.toUpperCase()}]:`, {
      metric: alert.metric,
      threshold: alert.threshold,
      current: alert.current,
      message
    });

    // In production, send to monitoring service
    this.sendTelemetry({
      type: 'alert',
      ...alert
    });
  }

  // Monitor memory usage
  private static checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usedPercent > 90) {
        this.createAlert('critical', 'memory_usage', 90, usedPercent);
      } else if (usedPercent > 75) {
        this.createAlert('warning', 'memory_usage', 75, usedPercent);
      }
    }
  }

  // Clean up old alerts
  private static cleanupOldAlerts() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  // Send telemetry data
  private static sendTelemetry(data: any) {
    // Use beacon API for reliable data transmission
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/telemetry', JSON.stringify(data));
    } else {
      // Fallback to fetch
      fetch('/api/telemetry', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {
        // Store for later transmission
        this.queueForBackground(data);
      });
    }
  }

  // Queue data for background sync
  private static queueForBackground(data: any) {
    if ('localStorage' in window) {
      const queue = JSON.parse(localStorage.getItem('perf_queue') || '[]');
      queue.push(data);
      localStorage.setItem('perf_queue', JSON.stringify(queue.slice(-100))); // Keep last 100
    }
  }

  // Get current performance metrics
  static getMetrics() {
    return {
      budgets: this.budgets.map(b => ({ ...b })),
      alerts: this.alerts.map(a => ({ ...a })),
      memoryUsage: this.getMemoryUsage(),
      networkStatus: navigator.onLine,
      serviceWorkerStatus: this.getServiceWorkerStatus()
    };
  }

  private static getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  private static getServiceWorkerStatus() {
    if ('serviceWorker' in navigator) {
      return {
        supported: true,
        registered: !!navigator.serviceWorker.controller,
        state: navigator.serviceWorker.controller?.state || 'not_registered'
      };
    }
    return { supported: false };
  }

  // Cleanup method
  static cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.alerts = [];
  }
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  EnterprisePerformanceSystem.initialize();
}