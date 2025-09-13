import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'error' | 'checking';
  details?: string;
  timestamp?: Date;
}

export default function DevHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runHealthChecks = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    const newChecks: HealthCheck[] = [
      { name: 'Database Connection', status: 'checking' },
      { name: 'Authentication Service', status: 'checking' },
      { name: 'Realtime Connection', status: 'checking' },
      { name: 'RPC Functions', status: 'checking' },
    ];
    
    setChecks([...newChecks]);

    try {
      // Database health check
      const { data: dbHealth, error: dbError } = await supabase.rpc('rpc_dashboard_health');
      newChecks[0] = {
        name: 'Database Connection',
        status: dbError ? 'error' : 'healthy',
        details: dbError ? dbError.message : 'Connected successfully',
        timestamp: new Date()
      };
      
      // Auth service check
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      newChecks[1] = {
        name: 'Authentication Service',
        status: authError ? 'error' : 'healthy',
        details: authError ? authError.message : session ? 'Authenticated' : 'Not signed in (normal)',
        timestamp: new Date()
      };

      // Realtime check
      const channel = supabase.channel('health_test');
      const realtimeConnected = channel.socket.isConnected();
      newChecks[2] = {
        name: 'Realtime Connection',
        status: realtimeConnected ? 'healthy' : 'error',
        details: realtimeConnected ? 'Connected' : 'Not connected',
        timestamp: new Date()
      };
      supabase.removeChannel(channel);

      // RPC function test
      try {
        const { error: rpcError } = await supabase.rpc('get_user_auth_data_secure', {
          target_user_id: session?.user?.id || '00000000-0000-0000-0000-000000000000'
        });
        newChecks[3] = {
          name: 'RPC Functions',
          status: rpcError && !rpcError.message.includes('Row Level Security') ? 'error' : 'healthy',
          details: rpcError ? rpcError.message : 'Functions accessible',
          timestamp: new Date()
        };
      } catch (error) {
        newChecks[3] = {
          name: 'RPC Functions',
          status: 'error',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
      }

    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: "Health Check Failed",
        description: "Unable to complete system health checks.",
        variant: "destructive"
      });
    }

    const endTime = Date.now();
    setChecks([...newChecks]);
    setIsRunning(false);
    
    toast({
      title: "Health Check Complete",
      description: `Completed in ${endTime - startTime}ms`,
    });
  };

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking': return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'checking': return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">Monitor system components and connectivity</p>
        </div>
        <Button 
          onClick={runHealthChecks} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Checks...' : 'Run Health Checks'}
        </Button>
      </div>

      <div className="grid gap-4">
        {checks.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Click "Run Health Checks" to test system components</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          checks.map((check, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    {check.name}
                  </CardTitle>
                  {getStatusBadge(check.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {check.details || 'No details available'}
                  </p>
                  {check.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      Last checked: {check.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Environment:</strong> {process.env.NODE_ENV || 'unknown'}
            </div>
            <div>
              <strong>User Agent:</strong> {navigator.userAgent.slice(0, 50)}...
            </div>
            <div>
              <strong>Viewport:</strong> {window.innerWidth} x {window.innerHeight}
            </div>
            <div>
              <strong>URL:</strong> {window.location.href}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}