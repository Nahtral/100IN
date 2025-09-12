import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ErrorLogger } from '@/utils/errorLogger';
import { useToast } from '@/hooks/use-toast';

interface SystemHealthStatus {
  database: 'healthy' | 'error' | 'checking';
  auth: 'healthy' | 'error' | 'checking';
  realtime: 'healthy' | 'error' | 'checking';
  lastChecked: Date | null;
}

export const SystemHealthMonitor: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus>({
    database: 'checking',
    auth: 'checking', 
    realtime: 'checking',
    lastChecked: null
  });
  const { toast } = useToast();

  const checkSystemHealth = async () => {
    try {
      // Test database connection
      const { data: dbTest, error: dbError } = await supabase.rpc('rpc_dashboard_health');
      
      // Test auth status
      const { data: { session } } = await supabase.auth.getSession();
      
      // Test realtime connection
      const channel = supabase.channel('health_check');
      const realtimeConnected = channel.socket.isConnected();
      supabase.removeChannel(channel);

      setHealthStatus({
        database: dbError ? 'error' : 'healthy',
        auth: session ? 'healthy' : 'error',
        realtime: realtimeConnected ? 'healthy' : 'error',
        lastChecked: new Date()
      });

      // Log any errors
      if (dbError) {
        ErrorLogger.logError(new Error('Database health check failed'), {
          component: 'SystemHealthMonitor',
          action: 'database_health_check',
          metadata: { error: dbError }
        });
      }

    } catch (error) {
      ErrorLogger.logCritical(error as Error, {
        component: 'SystemHealthMonitor',
        action: 'system_health_check',
        metadata: { fullCheck: true }
      });
      
      setHealthStatus(prev => ({
        ...prev,
        database: 'error',
        auth: 'error',
        realtime: 'error',
        lastChecked: new Date()
      }));

      toast({
        title: "System Health Warning",
        description: "Some system components are experiencing issues.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Initial health check
    checkSystemHealth();
    
    // Periodic health checks every 5 minutes
    const interval = setInterval(checkSystemHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Only show health indicator if there are issues
  const hasIssues = Object.values(healthStatus).some(status => status === 'error');
  
  if (!hasIssues) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md shadow-lg border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
          <span>System Issues Detected</span>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs mt-1 opacity-80">
            DB: {healthStatus.database} | Auth: {healthStatus.auth} | RT: {healthStatus.realtime}
          </div>
        )}
      </div>
    </div>
  );
};