import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Shield, Lock, Database, Calendar as CalendarIcon, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SecurityMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: string;
  metricTitle: string;
}

interface DetailedEvent {
  id: string;
  user_id: string;
  event_data: any;
  created_at: string;
}

const SecurityMetricsModal = ({ isOpen, onClose, metricType, metricTitle }: SecurityMetricsModalProps) => {
  const [events, setEvents] = useState<DetailedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    to: new Date()
  });
  const [timeFilter, setTimeFilter] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchDetailedEvents();
    }
  }, [isOpen, dateRange, metricType]);

  const fetchDetailedEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'security_event')
        .order('created_at', { ascending: false });

      // Filter by date range
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;

      // Filter by metric type
      let filteredEvents = data || [];
      if (metricType !== 'totalEvents') {
        filteredEvents = filteredEvents.filter(event => {
          const eventData = event.event_data as any;
          switch (metricType) {
            case 'criticalAlerts':
              return eventData?.severity === 'critical';
            case 'suspiciousActivity':
              return eventData?.security_event_type === 'suspicious_activity';
            case 'authFailures':
              return eventData?.security_event_type === 'auth_failure';
            case 'dataAccess':
              return eventData?.security_event_type === 'data_access';
            default:
              return true;
          }
        });
      }

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching detailed events:', error);
      toast({
        title: "Error",
        description: "Failed to load detailed security events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
    const now = new Date();
    let from: Date;
    
    switch (value) {
      case '1d':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({ from, to: now });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth_failure': return <Lock className="h-4 w-4" />;
      case 'data_access': return <Database className="h-4 w-4" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4" />;
      case 'sql_injection_attempt': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getMetricStats = () => {
    const totalCount = events.length;
    const severityBreakdown = events.reduce((acc, event) => {
      const severity = (event.event_data as any)?.severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentTrend = events.filter(event => 
      new Date(event.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return { totalCount, severityBreakdown, recentTrend };
  };

  const stats = getMetricStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {metricTitle} - Detailed Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Range:</label>
              <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Custom Range:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-fit">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange.from ? format(dateRange.from, 'MMM dd') : 'Pick date'} - {dateRange.to ? format(dateRange.to, 'MMM dd') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-bold">{stats.totalCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last 24h</p>
                    <p className="text-2xl font-bold">{stats.recentTrend}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                    <p className="text-2xl font-bold text-red-600">{stats.severityBreakdown.critical || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">High Priority</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.severityBreakdown.high || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Severity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(stats.severityBreakdown).map(([severity, count]) => (
                  <Badge key={severity} className={getSeverityColor(severity)}>
                    {severity.toUpperCase()}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Events</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No events found for the selected criteria</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getEventIcon((event.event_data as any)?.security_event_type)}
                        <div>
                          <p className="font-medium">
                            {((event.event_data as any)?.security_event_type as string)?.replace(/_/g, ' ').toUpperCase() || 'Security Event'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                          {(event.event_data as any)?.description && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                              {(event.event_data as any).description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor((event.event_data as any)?.severity)}>
                          {((event.event_data as any)?.severity as string)?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                        {(event.event_data as any)?.ip_address && (
                          <Badge variant="outline" className="text-xs">
                            {(event.event_data as any).ip_address}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityMetricsModal;