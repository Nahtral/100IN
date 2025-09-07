import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StorageValidator } from '@/utils/storageValidator';
import { ErrorLogger } from '@/utils/errorLogger';

interface ProductionReadinessMetrics {
  isReady: boolean;
  criticalIssues: string[];
  warnings: string[];
  performanceMetrics: {
    averageQueryTime: number;
    successRate: number;
    errorRate: number;
  };
  lastChecked: Date;
}

export const useProductionReadiness = () => {
  const [metrics, setMetrics] = useState<ProductionReadinessMetrics>({
    isReady: false,
    criticalIssues: [],
    warnings: [],
    performanceMetrics: {
      averageQueryTime: 0,
      successRate: 0,
      errorRate: 0
    },
    lastChecked: new Date()
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkProductionReadiness = async (): Promise<ProductionReadinessMetrics> => {
    setIsChecking(true);
    
    const newMetrics: ProductionReadinessMetrics = {
      isReady: true,
      criticalIssues: [],
      warnings: [],
      performanceMetrics: {
        averageQueryTime: 0,
        successRate: 0,
        errorRate: 0
      },
      lastChecked: new Date()
    };

    try {
      // 1. Test critical database functions
      const dbStartTime = performance.now();
      const { data: conversionTest, error: conversionError } = await supabase.rpc('bulk_convert_users_to_players', {
        user_ids: []
      });
      const dbQueryTime = performance.now() - dbStartTime;
      
      if (conversionError) {
        newMetrics.criticalIssues.push(`Database function error: ${conversionError.message}`);
        newMetrics.isReady = false;
      }

      // 2. Test storage accessibility
      const storageValidation = await StorageValidator.validateStorageSetup();
      if (!storageValidation.isValid) {
        newMetrics.criticalIssues.push(...storageValidation.errors);
        newMetrics.isReady = false;
      }
      newMetrics.warnings.push(...storageValidation.warnings);

      // 3. Test authentication and authorization
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) {
        newMetrics.warnings.push('No authenticated user for testing');
      } else {
        // Test RLS policies
        const { data: profileTest, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        if (profileError) {
          newMetrics.criticalIssues.push(`RLS policy error: ${profileError.message}`);
          newMetrics.isReady = false;
        }
      }

      // 4. Performance metrics
      const performanceTests = await Promise.allSettled([
        // Test profiles query performance
        measureQueryPerformance('profiles', () => 
          supabase.from('profiles').select('id, full_name').limit(10)
        ),
        // Test schedules query performance
        measureQueryPerformance('schedules', () => 
          supabase.from('schedules').select('id, title, start_time').limit(10)
        ),
        // Test user_roles query performance
        measureQueryPerformance('user_roles', () => 
          supabase.from('user_roles').select('user_id, role').limit(10)
        )
      ]);

      const successfulTests = performanceTests.filter(test => test.status === 'fulfilled');
      const failedTests = performanceTests.filter(test => test.status === 'rejected');

      if (successfulTests.length > 0) {
        const avgTime = successfulTests.reduce((sum, test) => {
          return sum + (test.status === 'fulfilled' ? test.value.duration : 0);
        }, 0) / successfulTests.length;

        newMetrics.performanceMetrics = {
          averageQueryTime: avgTime,
          successRate: (successfulTests.length / performanceTests.length) * 100,
          errorRate: (failedTests.length / performanceTests.length) * 100
        };

        // Performance warnings
        if (avgTime > 500) {
          newMetrics.warnings.push(`Slow average query time: ${avgTime.toFixed(0)}ms`);
        }
        
        if (failedTests.length > 0) {
          newMetrics.warnings.push(`${failedTests.length} query tests failed`);
        }
      }

      // 5. Mobile compatibility check
      const isMobile = window.innerWidth <= 768;
      const hasTouch = 'ontouchstart' in window;
      
      if (isMobile && !hasTouch) {
        newMetrics.warnings.push('Mobile viewport detected but no touch support');
      }

      // 6. Critical browser features
      const missingFeatures = [];
      if (!window.localStorage) missingFeatures.push('localStorage');
      if (!window.sessionStorage) missingFeatures.push('sessionStorage');
      if (!window.fetch) missingFeatures.push('fetch API');
      if (!window.Promise) missingFeatures.push('Promise support');
      
      if (missingFeatures.length > 0) {
        newMetrics.criticalIssues.push(`Missing browser features: ${missingFeatures.join(', ')}`);
        newMetrics.isReady = false;
      }

    } catch (error) {
      newMetrics.criticalIssues.push(`Production readiness check failed: ${error}`);
      newMetrics.isReady = false;
      
      await ErrorLogger.logCritical(error as Error, {
        component: 'useProductionReadiness',
        action: 'checkProductionReadiness'
      });
    }

    setMetrics(newMetrics);
    setIsChecking(false);
    return newMetrics;
  };

  const measureQueryPerformance = async (
    queryName: string, 
    queryFn: () => Promise<any>
  ): Promise<{ name: string; duration: number; success: boolean }> => {
    const startTime = performance.now();
    try {
      await queryFn();
      const duration = performance.now() - startTime;
      return { name: queryName, duration, success: true };
    } catch (error) {
      const duration = performance.now() - startTime;
      return { name: queryName, duration, success: false };
    }
  };

  // Auto-check on mount
  useEffect(() => {
    checkProductionReadiness();
  }, []);

  return {
    metrics,
    isChecking,
    checkProductionReadiness,
    isProductionReady: metrics.isReady && metrics.criticalIssues.length === 0
  };
};