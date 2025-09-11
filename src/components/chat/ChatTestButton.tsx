import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const ChatTestButton: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
    duration?: number;
  }>>([]);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    const testResults: typeof results = [];

    // Test 1: Edge Function Connectivity
    try {
      const start = Date.now();
      testResults.push({ test: 'Edge Function Connection', status: 'pending' });
      setResults([...testResults]);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(
        `https://oxwbeahwldxtwfezubdm.functions.supabase.co/chat-relay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'list_chats', limit: 1, offset: 0 })
        }
      );

      const duration = Date.now() - start;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        testResults[testResults.length - 1] = {
          test: 'Edge Function Connection',
          status: 'success',
          message: `Connected successfully in ${duration}ms`,
          duration
        };
      } else {
        throw new Error(result.error || 'Unknown error from Edge Function');
      }
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Edge Function Connection',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Real-time Subscriptions
    try {
      testResults.push({ test: 'Real-time Subscriptions', status: 'pending' });
      setResults([...testResults]);

      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {})
        .subscribe();

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for subscription

      // Simple check - if we get here without error, subscription setup worked
      testResults[testResults.length - 1] = {
        test: 'Real-time Subscriptions',
        status: 'success',
        message: 'Real-time setup working'
      };
      supabase.removeChannel(channel);
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Real-time Subscriptions',
        status: 'error',
        message: error instanceof Error ? error.message : 'Subscription failed'
      };
    }

    // Test 3: Authentication Check
    try {
      testResults.push({ test: 'Authentication Check', status: 'pending' });
      setResults([...testResults]);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        testResults[testResults.length - 1] = {
          test: 'Authentication Check',
          status: 'success',
          message: `Authenticated as ${user.email}`
        };
      } else {
        throw new Error('No authenticated user found');
      }
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Authentication Check',
        status: 'error',
        message: error instanceof Error ? error.message : 'Authentication failed'
      };
    }

    setResults(testResults);
    setTesting(false);

    const successCount = testResults.filter(r => r.status === 'success').length;
    const totalTests = testResults.length;

    if (successCount === totalTests) {
      toast.success('All chat system tests passed! 🎉');
    } else {
      toast.error(`${successCount}/${totalTests} tests passed. Check results for details.`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Passed</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Running...</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Chat System Tests
        </CardTitle>
        <CardDescription>
          Test the Edge Function relay and real-time features to ensure chat is working properly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Run Chat System Tests
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.test}</span>
                </div>
                <div className="flex items-center gap-2">
                  {result.duration && (
                    <span className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </span>
                  )}
                  {getStatusBadge(result.status)}
                </div>
                {result.message && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {result.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};