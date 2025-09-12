import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Target, Activity } from 'lucide-react';

interface DataInputPromptProps {
  dataType: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  priority?: 'high' | 'medium' | 'low';
  suggestions?: string[];
  className?: string;
}

export const DataInputPrompt: React.FC<DataInputPromptProps> = ({
  dataType,
  message,
  actionLabel,
  onAction,
  priority = 'medium',
  suggestions = [],
  className = ''
}) => {
  const getDataTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'shots':
      case 'shooting':
        return Target;
      case 'goals':
      case 'targets':
        return TrendingUp;
      case 'performance':
      case 'training':
        return Activity;
      default:
        return Plus;
    }
  };

  const getPriorityConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          color: 'border-red-200 bg-red-50',
          badgeVariant: 'destructive' as const,
          badgeText: 'Important'
        };
      case 'medium':
        return {
          color: 'border-yellow-200 bg-yellow-50',
          badgeVariant: 'secondary' as const,
          badgeText: 'Recommended'
        };
      case 'low':
        return {
          color: 'border-blue-200 bg-blue-50',
          badgeVariant: 'outline' as const,
          badgeText: 'Optional'
        };
      default:
        return {
          color: 'border-gray-200 bg-gray-50',
          badgeVariant: 'outline' as const,
          badgeText: 'Info'
        };
    }
  };

  const IconComponent = getDataTypeIcon(dataType);
  const priorityConfig = getPriorityConfig(priority);

  return (
    <Card className={`border-2 border-dashed ${priorityConfig.color} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconComponent className="h-4 w-4" />
            Add {dataType}
          </CardTitle>
          <Badge variant={priorityConfig.badgeVariant} className="text-xs">
            {priorityConfig.badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
        
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <Button 
          onClick={onAction}
          size="sm"
          className="w-full"
          variant={priority === 'high' ? 'default' : 'outline'}
        >
          <Plus className="h-3 w-3 mr-1" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
};