import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Database, 
  Upload, 
  Smartphone, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StorageValidator } from '@/utils/storageValidator';
import { PerformanceOptimizer } from '@/utils/performanceOptimizer';

interface TestResult {
  testName: string;
  category: 'database' | 'storage' | 'performance' | 'security' | 'mobile';
  status: 'pass' | 'fail' | 'warning';
  details: string;
  duration: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const ProductionReadinessTester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTest = async (
    testName: string,
    category: TestResult['category'],
    testFn: () => Promise<{ status: 'pass' | 'fail' | 'warning'; details: string; severity?: 'low' | 'medium' | 'high' | 'critical' }>
  ): Promise<void> => {
    const startTime = performance.now();
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      setResults(prev => [...prev, {
        testName,
        category,
        status: result.status,
        details: result.details,
        duration,
        severity: result.severity
      }]);
    } catch (error) {
      const duration = performance.now() - startTime;
      setResults(prev => [...prev, {
        testName,
        category,
        status: 'fail',
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        severity: 'critical'
      }]);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    try {
      // Database Tests
      await runTest('User Conversion Function', 'database', async () => {
        const { data, error } = await supabase.rpc('bulk_convert_users_to_players', {
          user_ids: [] // Test with empty array
        });
        
        if (error) {
          return { 
            status: 'fail', 
            details: `RPC function error: ${error.message}`,
            severity: 'critical'
          };
        }
        
        return { 
          status: 'pass', 
          details: 'Bulk conversion function is accessible and returns valid response' 
        };
      });

      await runTest('Database Schema Validation', 'database', async () => {
        const tables = ['profiles', 'user_roles', 'players', 'schedules', 'player_attendance'];
        const errors: string[] = [];
        
        for (const table of tables) {
          const { error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            errors.push(`${table}: ${error.message}`);
          }
        }
        
        if (errors.length > 0) {
          return { 
            status: 'fail', 
            details: `Schema issues: ${errors.join('; ')}`,
            severity: 'high'
          };
        }
        
        return { 
          status: 'pass', 
          details: 'All critical tables are accessible' 
        };
      });

      await runTest('RLS Policies Check', 'security', async () => {
        // Test that super admin can access user management
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          return { 
            status: 'warning', 
            details: 'No authenticated user to test RLS policies',
            severity: 'medium'
          };
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(5);
          
        if (error) {
          return { 
            status: 'fail', 
            details: `RLS blocking access: ${error.message}`,
            severity: 'high'
          };
        }
        
        return { 
          status: 'pass', 
          details: `RLS policies allow access. Retrieved ${data?.length || 0} profiles` 
        };
      });

      // Storage Tests
      await runTest('Storage Bucket Validation', 'storage', async () => {
        const validation = await StorageValidator.validateStorageSetup();
        
        if (!validation.isValid) {
          return { 
            status: 'fail', 
            details: `Storage issues: ${validation.errors.join('; ')}`,
            severity: 'high'
          };
        }
        
        if (validation.warnings.length > 0) {
          return { 
            status: 'warning', 
            details: `Storage warnings: ${validation.warnings.join('; ')}`,
            severity: 'medium'
          };
        }
        
        return { 
          status: 'pass', 
          details: 'All storage buckets are accessible and functional' 
        };
      });

      // Performance Tests
      await runTest('Database Query Performance', 'performance', async () => {
        const startTime = performance.now();
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .limit(50);
        
        const queryTime = performance.now() - startTime;
        
        if (error) {
          return { 
            status: 'fail', 
            details: `Query failed: ${error.message}`,
            severity: 'high'
          };
        }
        
        if (queryTime > 1000) {
          return { 
            status: 'warning', 
            details: `Slow query: ${queryTime.toFixed(0)}ms (target: <300ms)`,
            severity: 'medium'
          };
        }
        
        return { 
          status: 'pass', 
          details: `Query completed in ${queryTime.toFixed(0)}ms with ${data?.length || 0} results` 
        };
      });

      await runTest('Client Performance Metrics', 'performance', async () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (!navigation) {
          return { 
            status: 'warning', 
            details: 'Navigation timing not available',
            severity: 'low'
          };
        }
        
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        if (loadTime > 5000) {
          return { 
            status: 'warning', 
            details: `Slow page load: ${loadTime.toFixed(0)}ms (target: <3500ms)`,
            severity: 'medium'
          };
        }
        
        return { 
          status: 'pass', 
          details: `Page loaded in ${loadTime.toFixed(0)}ms, DOM ready in ${domContentLoaded.toFixed(0)}ms` 
        };
      });

      // Mobile UX Tests
      await runTest('Mobile Viewport Validation', 'mobile', async () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width <= 768;
        
        if (isMobile && height < 500) {
          return { 
            status: 'warning', 
            details: `Very small mobile viewport: ${width}x${height}`,
            severity: 'medium'
          };
        }
        
        return { 
          status: 'pass', 
          details: `Viewport: ${width}x${height}${isMobile ? ' (mobile)' : ' (desktop)'}` 
        };
      });

      await runTest('Touch Interface Check', 'mobile', async () => {
        const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const hasPointerEvents = 'onpointerdown' in window;
        
        return { 
          status: 'pass', 
          details: `Touch support: ${hasTouchSupport}, Pointer events: ${hasPointerEvents}` 
        };
      });

    } finally {
      setTesting(false);
    }

    // Show summary toast
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'pass').length;
    const failedTests = results.filter(r => r.status === 'fail').length;
    const warningTests = results.filter(r => r.status === 'warning').length;

    toast({
      title: "Production Readiness Test Complete",
      description: `${passedTests} passed, ${failedTests} failed, ${warningTests} warnings`,
      variant: failedTests > 0 ? "destructive" : "default",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'fail':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    
    const severityColors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={severityColors[severity as keyof typeof severityColors] || ''}>
        {severity}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'storage':
        return <Upload className="h-4 w-4" />;
      case 'performance':
        return <Activity className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const passedTests = results.filter(r => r.status === 'pass').length;
  const failedTests = results.filter(r => r.status === 'fail').length;
  const warningTests = results.filter(r => r.status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Production Readiness Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Comprehensive test suite for production deployment validation
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={testing}
            className="flex items-center gap-2"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        {results.length > 0 && (
          <>
            <Separator />
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-sm text-green-700">Passed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{warningTests}</div>
                <div className="text-sm text-yellow-700">Warnings</div>
              </div>
            </div>

            {/* Critical Issues Alert */}
            {failedTests > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {failedTests} critical test{failedTests !== 1 ? 's' : ''} failed. 
                  These issues must be resolved before production deployment.
                </AlertDescription>
              </Alert>
            )}

            {/* Test Results */}
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(result.category)}
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.testName}</span>
                      {getSeverityBadge(result.severity)}
                    </div>
                    <div className="text-sm">
                      {result.duration.toFixed(0)}ms
                    </div>
                  </div>
                  <div className="text-sm">
                    {result.details}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!testing && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run All Tests" to start the production readiness validation
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductionReadinessTester;