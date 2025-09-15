import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface HealthCheck {
  check_type: string;
  status: 'healthy' | 'degraded' | 'failed';
  response_time_ms: number;
  error_message?: string;
  created_at: string;
}

interface AnalyticsEvent {
  created_at: string;
  event_data: any;
  event_type: string;
  id: string;
}

export const SystemHealthCheck = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const performHealthCheck = async () => {
    setChecking(true);
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      const { data: dbTest, error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      const dbResponseTime = Date.now() - startTime;
      
      // Log to analytics instead of system_health_checks table
      await supabase.from('analytics_events').insert({
        event_type: 'health_check',
        event_data: {
          check_type: 'database_connectivity',
          status: dbError ? 'failed' : 'healthy',
          response_time_ms: dbResponseTime,
          error_message: dbError?.message
        }
      });

      // Test authentication
      const authStartTime = Date.now();
      const { data: authTest, error: authError } = await supabase.auth.getSession();
      const authResponseTime = Date.now() - authStartTime;
      
      await supabase.from('analytics_events').insert({
        event_type: 'health_check',
        event_data: {
          check_type: 'authentication',
          status: authError ? 'failed' : 'healthy',
          response_time_ms: authResponseTime,
          error_message: authError?.message
        }
      });

      // Test critical RPC functions
      const rpcStartTime = Date.now();
      const { data: rpcTest, error: rpcError } = await supabase.rpc('rpc_dashboard_health');
      const rpcResponseTime = Date.now() - rpcStartTime;
      
      await supabase.from('analytics_events').insert({
        event_type: 'health_check',
        event_data: {
          check_type: 'rpc_functions',
          status: rpcError ? 'failed' : 'healthy',
          response_time_ms: rpcResponseTime,
          error_message: rpcError?.message
        }
      });

      fetchHealthChecks();
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const fetchHealthChecks = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'health_check')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        const transformedData: HealthCheck[] = data.map((event: AnalyticsEvent) => ({
          check_type: event.event_data?.check_type || 'unknown',
          status: event.event_data?.status || 'failed',
          response_time_ms: event.event_data?.response_time_ms || 0,
          error_message: event.event_data?.error_message,
          created_at: event.created_at
        }));
        setHealthChecks(transformedData);
      }
    } catch (error) {
      console.error('Failed to fetch health checks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'healthy' ? 'default' : status === 'degraded' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health Dashboard</CardTitle>
              <CardDescription>Monitor critical system components</CardDescription>
            </div>
            <Button 
              onClick={performHealthCheck}
              disabled={checking}
              size="sm"
            >
              {checking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Run Check
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthChecks.length === 0 ? (
              <p className="text-muted-foreground">No health checks available. Run a check to see system status.</p>
            ) : (
              <div className="grid gap-3">
                {healthChecks.slice(0, 6).map((check, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium">{check.check_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">
                          Response: {check.response_time_ms}ms
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(check.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(check.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};