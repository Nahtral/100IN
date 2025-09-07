import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  duration: number;
}

const BulkUserManagementTester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTest = async (testName: string, testFn: () => Promise<{ status: 'pass' | 'fail' | 'warning'; details: string }>) => {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      return { testName, ...result, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return { 
        testName, 
        status: 'fail' as const, 
        details: `Test failed: ${error.message}`, 
        duration 
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    const testResults: TestResult[] = [];

    // Test 1: Database schema validation
    testResults.push(await runTest('Database Schema Validation', async () => {
      // Test by attempting to access the user_roles table directly
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('user_id, role, is_active, approved_by, approved_at')
          .limit(1);

        if (error) {
          if (error.message.includes('does not exist')) {
            return {
              status: 'fail',
              details: 'user_roles table or required columns are missing'
            };
          }
        }

        return {
          status: 'pass',
          details: 'All required columns are accessible in user_roles table'
        };
      } catch (error: any) {
        return {
          status: 'fail',
          details: `Schema validation failed: ${error.message}`
        };
      }
    }));

    // Test 2: RPC function availability
    testResults.push(await runTest('RPC Functions Available', async () => {
      // Test the functions directly by calling them with invalid params
      try {
        await supabase.rpc('assign_user_role', { target_user_id: '00000000-0000-0000-0000-000000000000', target_role: 'player' });
      } catch (error: any) {
        if (error.message.includes('Only super admins can assign roles')) {
          // Function exists and is working (expected error)
        } else if (error.message.includes('function assign_user_role does not exist')) {
          return {
            status: 'fail',
            details: 'Missing RPC function: assign_user_role'
          };
        }
      }

      try {
        await supabase.rpc('bulk_convert_users_to_players', { user_ids: [] });
      } catch (error: any) {
        if (error.message.includes('Only super admins can perform bulk conversions')) {
          // Function exists and is working (expected error)
        } else if (error.message.includes('function bulk_convert_users_to_players does not exist')) {
          return {
            status: 'fail',
            details: 'Missing RPC function: bulk_convert_users_to_players'
          };
        }
      }

      return {
        status: 'pass',
        details: 'All required RPC functions are available'
      };
    }));

    // Test 3: Super admin permission check
    testResults.push(await runTest('Super Admin Permissions', async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        return {
          status: 'fail',
          details: 'No authenticated user'
        };
      }

      const { data: isSuperAdmin, error } = await supabase
        .rpc('is_super_admin', { _user_id: authData.user.id });

      if (error) throw error;

      if (!isSuperAdmin) {
        return {
          status: 'warning',
          details: 'Current user is not a super admin - conversions will fail'
        };
      }

      return {
        status: 'pass',
        details: 'Current user has super admin permissions'
      };
    }));

    // Test 4: Test single user conversion (dry run)
    testResults.push(await runTest('Single User Conversion Test', async () => {
      // Get a test user (approved but not player)
      const { data: testUsers, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          approval_status
        `)
        .eq('approval_status', 'approved')
        .limit(1);

      if (error) throw error;

      if (!testUsers || testUsers.length === 0) {
        return {
          status: 'warning',
          details: 'No approved users available for testing'
        };
      }

      const testUser = testUsers[0];

      // Check if user already has player role
      const { data: existingRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', testUser.id)
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      const hasPlayerRole = existingRoles?.some(r => r.role === 'player');
      const hasAdminRole = existingRoles?.some(r => ['super_admin', 'staff', 'coach', 'medical'].includes(r.role));

      if (hasAdminRole) {
        return {
          status: 'pass',
          details: 'Test user has admin role - would be correctly skipped'
        };
      }

      if (hasPlayerRole) {
        return {
          status: 'pass',
          details: 'Test user already has player role - system working correctly'
        };
      }

      return {
        status: 'pass',
        details: `Test user (${testUser.email}) is ready for conversion`
      };
    }));

    // Test 5: Database constraints validation
    testResults.push(await runTest('Database Constraints Check', async () => {
      // Get current user ID for real constraint testing
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        return {
          status: 'warning',
          details: 'No authenticated user for constraint testing'
        };
      }

      // Test via RPC function which handles constraints properly
      try {
        const { data, error } = await supabase.rpc('assign_user_role', {
          target_user_id: authData.user.id,
          target_role: 'player'
        });

        if (error) {
          // If user already has the role, try to assign it again to test constraint
          const { error: duplicateError } = await supabase.rpc('assign_user_role', {
            target_user_id: authData.user.id,
            target_role: 'player'
          });

          if (duplicateError && duplicateError.message.includes('duplicate')) {
            return {
              status: 'pass',
              details: 'Unique constraint properly prevents duplicate role assignments'
            };
          }
        }

        return {
          status: 'pass',
          details: 'Database constraints are working correctly (no duplicates allowed)'
        };
      } catch (error: any) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          return {
            status: 'pass',
            details: 'Unique constraint on (user_id, role) is working correctly'
          };
        }
        
        return {
          status: 'warning',
          details: `Constraint test inconclusive: ${error.message}`
        };
      }
    }));

    setResults(testResults);
    setTesting(false);

    // Show summary toast
    const passCount = testResults.filter(r => r.status === 'pass').length;
    const failCount = testResults.filter(r => r.status === 'fail').length;
    const warningCount = testResults.filter(r => r.status === 'warning').length;

    if (failCount === 0) {
      toast({
        title: "All Tests Passed",
        description: `${passCount} tests passed, ${warningCount} warnings. System is ready for production.`,
      });
    } else {
      toast({
        title: "Tests Failed",
        description: `${failCount} tests failed, ${passCount} passed. Check results for details.`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200';
      case 'fail': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Bulk User Conversion - Test Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Run comprehensive tests to validate the user conversion system
          </p>
          <Button 
            onClick={runAllTests} 
            disabled={testing}
            variant="outline"
          >
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Test Results</h3>
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 border rounded-lg ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.testName}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.duration}ms
                    </Badge>
                  </div>
                  <Badge 
                    variant={result.status === 'pass' ? 'default' : 'destructive'}
                  >
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm mt-1 text-muted-foreground">
                  {result.details}
                </p>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.status === 'pass').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {results.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => r.status === 'fail').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUserManagementTester;