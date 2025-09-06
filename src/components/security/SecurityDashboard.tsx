import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Eye, AlertTriangle, Lock, User, Database, Plus, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SecurityEventModal from './SecurityEventModal';
import SecurityMetricsModal from './SecurityMetricsModal';

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalAlerts: number;
  suspiciousActivity: number;
  authFailures: number;
  dataAccess: number;
}

const SecurityDashboard = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalAlerts: 0,
    suspiciousActivity: 0,
    authFailures: 0,
    dataAccess: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<{type: string, title: string}>({type: '', title: ''});
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSecurityData();
    }
  }, [isSuperAdmin]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent security events
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'security_event')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSecurityEvents(events || []);
      
      // Calculate metrics
      const eventData = events || [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentEvents = eventData.filter(event => 
        new Date(event.created_at) > last24Hours
      );

      setMetrics({
        totalEvents: recentEvents.length,
        criticalAlerts: recentEvents.filter(e => {
          const data = e.event_data as any;
          return data?.severity === 'critical';
        }).length,
        suspiciousActivity: recentEvents.filter(e => {
          const data = e.event_data as any;
          return data?.security_event_type === 'suspicious_activity';
        }).length,
        authFailures: recentEvents.filter(e => {
          const data = e.event_data as any;
          return data?.security_event_type === 'auth_failure';
        }).length,
        dataAccess: recentEvents.filter(e => {
          const data = e.event_data as any;
          return data?.security_event_type === 'data_access';
        }).length
      });

    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Security Dashboard Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth_failure': return <Lock className="h-4 w-4" />;
      case 'data_access': return <Database className="h-4 w-4" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4" />;
      case 'sql_injection_attempt': return <Shield className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const openEventModal = (event: SecurityEvent | null, mode: 'view' | 'edit' | 'create') => {
    setSelectedEvent(event);
    setEventModalMode(mode);
    setEventModalOpen(true);
  };

  const openMetricsModal = (metricType: string, metricTitle: string) => {
    setSelectedMetric({ type: metricType, title: metricTitle });
    setMetricsModalOpen(true);
  };

  const closeModals = () => {
    setEventModalOpen(false);
    setMetricsModalOpen(false);
    setSelectedEvent(null);
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          Only super administrators can access the security dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => openEventModal(null, 'create')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
          <Button onClick={fetchSecurityData} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => openMetricsModal('totalEvents', 'Total Events')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events (24h)</p>
                  <p className="text-2xl font-bold">{metrics.totalEvents}</p>
                </div>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => openMetricsModal('criticalAlerts', 'Critical Alerts')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.criticalAlerts}</p>
                </div>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => openMetricsModal('suspiciousActivity', 'Suspicious Activity')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Suspicious Activity</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.suspiciousActivity}</p>
                </div>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => openMetricsModal('authFailures', 'Authentication Failures')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auth Failures</p>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.authFailures}</p>
                </div>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => openMetricsModal('dataAccess', 'Data Access Events')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Access</p>
                  <p className="text-2xl font-bold">{metrics.dataAccess}</p>
                </div>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No security events found</p>
            ) : (
              securityEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => openEventModal(event, 'view')}
                >
                  <div className="flex items-center space-x-3">
                    {getEventIcon((event.event_data as any)?.security_event_type)}
                    <div>
                      <p className="font-medium">
                        {((event.event_data as any)?.security_event_type as string)?.replace(/_/g, ' ').toUpperCase() || 'Security Event'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                      {(event.event_data as any)?.user_role && (
                        <p className="text-xs text-muted-foreground">
                          User Role: {(event.event_data as any).user_role}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={`${getSeverityColor((event.event_data as any)?.severity)} text-white`}
                      variant="secondary"
                    >
                      {((event.event_data as any)?.severity as string)?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                    {event.user_id && (
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        User
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Enhanced Security Active</AlertTitle>
              <AlertDescription>
                Your system now has comprehensive security monitoring, input sanitization, 
                and RLS policies to protect sensitive data.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm mb-2">✅ Implemented</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Enhanced RLS policies</li>
                  <li>• Input sanitization</li>
                  <li>• SQL injection prevention</li>
                  <li>• Audit logging</li>
                  <li>• Rate limiting</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-sm mb-2">🔄 Monitoring</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time threat detection</li>
                  <li>• Form submission validation</li>
                  <li>• Sensitive data access logs</li>
                  <li>• Authentication monitoring</li>
                  <li>• Data masking for unauthorized users</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <SecurityEventModal
        event={selectedEvent}
        isOpen={eventModalOpen}
        onClose={closeModals}
        onRefresh={fetchSecurityData}
        mode={eventModalMode}
      />

      <SecurityMetricsModal
        isOpen={metricsModalOpen}
        onClose={closeModals}
        metricType={selectedMetric.type}
        metricTitle={selectedMetric.title}
      />
    </div>
  );
};

export default SecurityDashboard;