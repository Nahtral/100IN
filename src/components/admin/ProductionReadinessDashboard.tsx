import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useProductionReadiness } from '@/hooks/useProductionReadiness';

export const ProductionReadinessDashboard: React.FC = () => {
  const { metrics, isChecking, checkProductionReadiness, isProductionReady } = useProductionReadiness();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProductionReady ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          Production Readiness Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <Badge 
              variant={isProductionReady ? "default" : "destructive"}
              className="w-full justify-center"
            >
              {isProductionReady ? 'Ready for Production' : 'Not Ready'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Last Checked</div>
            <div className="text-sm text-muted-foreground">
              {metrics.lastChecked.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {metrics.criticalIssues.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-red-600">Critical Issues</div>
            <div className="space-y-1">
              {metrics.criticalIssues.map((issue, index) => (
                <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                  {issue}
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.warnings.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-yellow-600">Warnings</div>
            <div className="space-y-1">
              {metrics.warnings.slice(0, 3).map((warning, index) => (
                <div key={index} className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                  {warning}
                </div>
              ))}
              {metrics.warnings.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{metrics.warnings.length - 3} more warnings
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Avg Query Time</div>
            <div className="text-lg font-medium">
              {metrics.performanceMetrics.averageQueryTime.toFixed(0)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Success Rate</div>
            <div className="text-lg font-medium">
              {metrics.performanceMetrics.successRate.toFixed(1)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Error Rate</div>
            <div className="text-lg font-medium">
              {metrics.performanceMetrics.errorRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};