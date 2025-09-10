import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useHealthContext } from '@/contexts/HealthContext';

interface HealthSyncIndicatorProps {
  className?: string;
}

const HealthSyncIndicator: React.FC<HealthSyncIndicatorProps> = ({ className = "" }) => {
  const { metrics, loading, error } = useHealthContext();
  
  const getSyncStatus = () => {
    if (loading) return 'syncing';
    if (error) return 'error';
    
    const timeSinceUpdate = Date.now() - new Date(metrics.lastUpdated).getTime();
    if (timeSinceUpdate < 30000) return 'fresh'; // Less than 30 seconds
    if (timeSinceUpdate < 300000) return 'recent'; // Less than 5 minutes
    return 'stale';
  };

  const getStatusConfig = () => {
    const status = getSyncStatus();
    
    switch (status) {
      case 'syncing':
        return {
          icon: RefreshCw,
          text: 'Syncing...',
          badge: 'Updating',
          variant: 'secondary' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'fresh':
        return {
          icon: CheckCircle2,
          text: 'Real-time',
          badge: 'Live',
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'recent':
        return {
          icon: Wifi,
          text: 'Connected',
          badge: 'Recent',
          variant: 'secondary' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Sync Error',
          badge: 'Error',
          variant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Clock,
          text: 'Outdated',
          badge: 'Stale',
          variant: 'outline' as const,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isAnimating = getSyncStatus() === 'syncing';

  return (
    <Card className={`${config.borderColor} ${config.bgColor} ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon 
              className={`h-4 w-4 ${config.color} ${isAnimating ? 'animate-spin' : ''}`} 
            />
            <span className={`text-sm font-medium ${config.color}`}>
              {config.text}
            </span>
          </div>
          
          <Badge variant={config.variant} className="text-xs">
            {config.badge}
          </Badge>
        </div>
        
        {metrics.lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Last update: {new Date(metrics.lastUpdated).toLocaleTimeString()}
          </p>
        )}
        
        {error && (
          <p className="text-xs text-red-600 mt-1 truncate" title={error}>
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthSyncIndicator;