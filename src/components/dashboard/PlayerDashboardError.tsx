import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface PlayerDashboardErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const PlayerDashboardError: React.FC<PlayerDashboardErrorProps> = ({
  title = "Unable to load dashboard",
  message,
  onRetry,
  showRetry = true
}) => {
  return (
    <Card className="card-enhanced border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{message}</p>
        
        {showRetry && onRetry && (
          <div className="flex gap-2">
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p>If this problem persists, please contact your coach or administrator.</p>
        </div>
      </CardContent>
    </Card>
  );
};