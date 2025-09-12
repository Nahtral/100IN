import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ClickableDashboardCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const ClickableDashboardCard: React.FC<ClickableDashboardCardProps> = ({
  icon: Icon,
  title,
  value,
  description,
  onClick,
  variant = 'default',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'hover:bg-primary/5 border-primary/20 hover:border-primary/40';
      case 'success':
        return 'hover:bg-green-500/5 border-green-500/20 hover:border-green-500/40';
      case 'warning':
        return 'hover:bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40';
      case 'danger':
        return 'hover:bg-red-500/5 border-red-500/20 hover:border-red-500/40';
      default:
        return 'hover:bg-accent/50 border-border hover:border-accent';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-primary';
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'danger':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:shadow-gold border-2 ${getVariantStyles()} ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${getIconColor()}`} />
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">
                {value.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm sm:text-base font-medium text-foreground">
              {title}
            </div>
            {description && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};