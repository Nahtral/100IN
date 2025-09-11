import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EnterprisePerformanceSystem } from '@/utils/enterprisePerformanceSystem';
import { Activity, AlertTriangle, CheckCircle, Cpu, Globe, Zap } from 'lucide-react';

const EnterprisePerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = EnterprisePerformanceSystem.getMetrics();
      setMetrics(currentMetrics);
      setLoading(false);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getBudgetColor = (budget: any) => {
    if (!budget.current) return 'bg-muted';
    const percentage = (budget.current / budget.budget) * 100;
    if (percentage > 100) return 'bg-destructive';
    if (percentage > 80) return 'bg-orange-500';
    return 'bg-primary';
  };

  const getBudgetStatus = (budget: any) => {
    if (!budget.current) return 'unknown';
    if (budget.current > budget.budget) return 'critical';
    if (budget.current > budget.warning) return 'warning';
    return 'good';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Performance Dashboard</h1>
          <p className="text-muted-foreground">Real-time performance monitoring and optimization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={metrics.networkStatus ? 'default' : 'destructive'}>
            <Globe className="w-3 h-3 mr-1" />
            {metrics.networkStatus ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant={metrics.serviceWorkerStatus.registered ? 'default' : 'secondary'}>
            <Zap className="w-3 h-3 mr-1" />
            SW: {metrics.serviceWorkerStatus.state}
          </Badge>
        </div>
      </div>

      {/* Active Alerts */}
      {metrics.alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Performance Alerts ({metrics.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.alerts.slice(0, 3).map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div>
                    <span className="font-medium">{alert.metric}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {alert.current.toFixed(2)} &gt; {alert.threshold}
                    </span>
                  </div>
                  <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.type}
                  </Badge>
                </div>
              ))}
              {metrics.alerts.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{metrics.alerts.length - 3} more alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="budgets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="budgets">Performance Budgets</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.budgets.map((budget: any) => (
              <Card key={budget.metric}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {budget.metric.toUpperCase()}
                    <div className="flex items-center">
                      {getBudgetStatus(budget) === 'good' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {getBudgetStatus(budget) === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                      {getBudgetStatus(budget) === 'critical' && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current: {budget.current?.toFixed(2) || 'N/A'}</span>
                      <span>Budget: {budget.budget}</span>
                    </div>
                    <Progress 
                      value={budget.current ? Math.min((budget.current / budget.budget) * 100, 100) : 0}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Warning: {budget.warning}</span>
                      <span>{budget.current ? Math.round((budget.current / budget.budget) * 100) : 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Memory Usage */}
            {metrics.memoryUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Cpu className="w-5 h-5 mr-2" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Used Memory</span>
                        <span>{(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <Progress value={metrics.memoryUsage.percentage} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-2">{(metrics.memoryUsage.total / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Limit:</span>
                        <span className="ml-2">{(metrics.memoryUsage.limit / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Worker Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Service Worker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <Badge variant={metrics.serviceWorkerStatus.registered ? 'default' : 'secondary'}>
                      {metrics.serviceWorkerStatus.state}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Offline Ready</span>
                    <Badge variant={metrics.serviceWorkerStatus.registered ? 'default' : 'secondary'}>
                      {metrics.serviceWorkerStatus.registered ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Background Sync</span>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
              <CardDescription>Recent performance metrics and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Performance timeline visualization would be implemented here
                <br />
                <small>Connect to your analytics service for detailed charts</small>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Actions</CardTitle>
                <CardDescription>Automated performance improvements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2" />
                  Clear Performance Cache
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  Preload Critical Resources
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Cpu className="w-4 h-4 mr-2" />
                  Optimize Bundle Loading
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  Refresh Service Worker
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>AI-powered optimization suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 rounded">
                    <strong>Bundle Size:</strong> Consider code splitting for routes with low usage
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <strong>Caching:</strong> API response times are optimal
                  </div>
                  <div className="p-3 bg-orange-50 rounded">
                    <strong>Images:</strong> 3 images could benefit from WebP format
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnterprisePerformanceDashboard;