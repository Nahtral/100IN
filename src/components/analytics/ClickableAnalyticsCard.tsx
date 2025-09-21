import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ClickableAnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export const ClickableAnalyticsCard: React.FC<ClickableAnalyticsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  badge,
  onClick,
  loading = false,
  className
}) => {
  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer border-muted",
        onClick && "hover:bg-accent/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {value}
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {badge && (
              <Badge variant={badge.variant} className="text-xs">
                {badge.text}
              </Badge>
            )}
            {trend && (
              <div className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};