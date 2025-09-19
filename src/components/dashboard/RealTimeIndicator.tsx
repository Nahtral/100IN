import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealTimeIndicatorProps {
  isRealTime: boolean;
  lastUpdated?: string;
  className?: string;
}

export const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  isRealTime,
  lastUpdated,
  className
}) => {
  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just updated';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant={isRealTime ? "default" : "secondary"}
        className={cn(
          "text-xs",
          isRealTime 
            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
        )}
      >
        {isRealTime ? (
          <>
            <Wifi className="h-3 w-3 mr-1" />
            Live
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </>
        )}
      </Badge>
      
      {lastUpdated && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatLastUpdated(lastUpdated)}
        </div>
      )}
    </div>
  );
};