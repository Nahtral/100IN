import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

interface DataQualityIndicatorProps {
  totalRecords: number;
  sourceType: string;
  lastUpdated?: string;
  confidence: 'high' | 'medium' | 'low';
  missingData?: string[];
  className?: string;
}

export const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
  totalRecords,
  sourceType,
  lastUpdated,
  confidence,
  missingData = [],
  className = ''
}) => {
  const getConfidenceConfig = (level: string) => {
    switch (level) {
      case 'high':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'High Quality',
          description: 'Data is complete and recent'
        };
      case 'medium':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          label: 'Partial Data',
          description: 'Some data may be missing or outdated'
        };
      case 'low':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Limited Data',
          description: 'Significant data gaps detected'
        };
      default:
        return {
          icon: Database,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Unknown',
          description: 'Data quality unknown'
        };
    }
  };

  const config = getConfidenceConfig(confidence);
  const IconComponent = config.icon;

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getDataSourceDescription = () => {
    const parts = [
      `Based on ${totalRecords} ${sourceType}${totalRecords !== 1 ? 's' : ''}`,
    ];
    
    if (lastUpdated) {
      parts.push(`Updated ${formatLastUpdated(lastUpdated)}`);
    }

    if (missingData.length > 0) {
      parts.push(`Missing: ${missingData.join(', ')}`);
    }

    return parts.join(' • ');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${config.bg} ${config.border} border ${className}`}>
            <IconComponent className={`h-3 w-3 ${config.color}`} />
            <span className={`font-medium ${config.color}`}>
              {config.label}
            </span>
            <span className="text-gray-600">
              ({totalRecords})
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          <div className="space-y-2">
            <p className="font-medium">{config.description}</p>
            <p className="text-xs text-muted-foreground">
              {getDataSourceDescription()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};