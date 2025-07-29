import { useState, useEffect, useCallback } from 'react';
import { useAnalytics } from './useAnalytics';

interface PerformanceMetrics {
  apiCalls: Record<string, {
    count: number;
    totalTime: number;
    averageTime: number;
    errors: number;
  }>;
  pageLoadTime?: number;
  renderTime?: number;
}

export const usePerformanceMonitoring = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCalls: {}
  });
  const { track } = useAnalytics();

  useEffect(() => {
    // Track page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        setMetrics(prev => ({
          ...prev,
          pageLoadTime
        }));
        
        track('page_performance', {
          component: componentName,
          loadTime: pageLoadTime,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        });
      }
    }

    // Track component render time
    const renderStart = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStart;
      setMetrics(prev => ({
        ...prev,
        renderTime
      }));
    };
  }, [componentName, track]);

  const measureApiCall = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;

      setMetrics(prev => {
        const existing = prev.apiCalls[apiName] || {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          errors: 0
        };

        const newCount = existing.count + 1;
        const newTotalTime = existing.totalTime + duration;
        const newAverageTime = newTotalTime / newCount;

        return {
          ...prev,
          apiCalls: {
            ...prev.apiCalls,
            [apiName]: {
              count: newCount,
              totalTime: newTotalTime,
              averageTime: newAverageTime,
              errors: existing.errors
            }
          }
        };
      });

      // Track successful API call
      track('api_call_success', {
        component: componentName,
        apiName,
        duration,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      setMetrics(prev => {
        const existing = prev.apiCalls[apiName] || {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          errors: 0
        };

        return {
          ...prev,
          apiCalls: {
            ...prev.apiCalls,
            [apiName]: {
              ...existing,
              errors: existing.errors + 1
            }
          }
        };
      });

      // Track API call error
      track('api_call_error', {
        component: componentName,
        apiName,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });

      throw error;
    }
  }, [componentName, track]);

  const measureUserAction = useCallback((actionName: string, action: () => void) => {
    const startTime = performance.now();
    
    try {
      action();
      const endTime = performance.now();
      const duration = endTime - startTime;

      track('user_action_performance', {
        component: componentName,
        action: actionName,
        duration,
        timestamp: Date.now()
      });
    } catch (error) {
      track('user_action_error', {
        component: componentName,
        action: actionName,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
      throw error;
    }
  }, [componentName, track]);

  const getMetricsSummary = useCallback(() => {
    const apiCallsArray = Object.entries(metrics.apiCalls).map(([name, data]) => ({
      name,
      ...data,
      successRate: data.count > 0 ? ((data.count - data.errors) / data.count) * 100 : 0
    }));

    return {
      ...metrics,
      apiCallsSummary: apiCallsArray,
      totalApiCalls: apiCallsArray.reduce((sum, api) => sum + api.count, 0),
      totalApiErrors: apiCallsArray.reduce((sum, api) => sum + api.errors, 0),
      averageApiTime: apiCallsArray.length > 0 
        ? apiCallsArray.reduce((sum, api) => sum + api.averageTime, 0) / apiCallsArray.length 
        : 0
    };
  }, [metrics]);

  return {
    metrics,
    measureApiCall,
    measureUserAction,
    getMetricsSummary
  };
};