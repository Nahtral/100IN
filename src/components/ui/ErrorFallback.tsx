import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  Shield, 
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';

interface ErrorFallbackProps {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
  description?: string;
  variant?: 'default' | 'compact' | 'inline';
  showDetails?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  title,
  description,
  variant = 'default',
  showDetails = false,
  actions = []
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const errorMessage = error instanceof Error ? error.message : error || 'An unexpected error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Determine error type and provide specific guidance
  const getErrorType = (message: string) => {
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return {
        type: 'network',
        icon: Wifi,
        title: 'Connection Issue',
        description: 'Unable to connect to the server. Please check your internet connection.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }
    
    if (message.includes('permission denied') || message.includes('unauthorized') || message.includes('row-level security')) {
      return {
        type: 'permission',
        icon: Shield,
        title: 'Access Denied',
        description: 'You do not have permission to view this data. Contact your administrator.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    
    if (message.includes('not found') || message.includes('NOT_FOUND')) {
      return {
        type: 'not_found',
        icon: HelpCircle,
        title: 'Data Not Found',
        description: 'The requested information could not be found.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }
    
    return {
      type: 'general',
      icon: AlertTriangle,
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try again.',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };
  
  const errorInfo = getErrorType(errorMessage);
  const Icon = errorInfo.icon;
  
  // Compact variant for inline errors
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${errorInfo.bgColor} ${errorInfo.borderColor} border`}>
        <Icon className={`h-4 w-4 ${errorInfo.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{title || errorInfo.title}</p>
          <p className="text-xs text-gray-600 truncate">{description || errorInfo.description}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="flex-shrink-0">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }
  
  // Inline variant for form errors
  if (variant === 'inline') {
    return (
      <div className="flex items-start gap-2 text-sm text-red-600">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{errorMessage}</span>
      </div>
    );
  }
  
  // Default card variant
  return (
    <Card className={`${errorInfo.borderColor} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${errorInfo.bgColor}`}>
            <Icon className={`h-5 w-5 ${errorInfo.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title || errorInfo.title}</h3>
            <Badge variant="outline" className="mt-1">
              {errorInfo.type}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          {description || errorInfo.description}
        </p>
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
        
        {/* Error details toggle */}
        {showDetails && (errorStack || errorMessage) && (
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
            >
              {detailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {detailsOpen ? 'Hide' : 'Show'} Error Details
            </Button>
            
            {detailsOpen && (
              <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs font-mono text-gray-700 overflow-auto max-h-32">
                <div className="mb-2">
                  <strong>Error:</strong> {errorMessage}
                </div>
                {errorStack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{errorStack}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized components for common error scenarios
export const NetworkErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorFallback
    error="Failed to fetch data"
    onRetry={onRetry}
    actions={[
      { label: 'Check Connection', onClick: () => window.location.reload(), variant: 'outline' }
    ]}
  />
);

export const PermissionErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorFallback
    error="permission denied"
    onRetry={onRetry}
    actions={[
      { label: 'Contact Support', onClick: () => window.open('mailto:support@example.com'), variant: 'outline' }
    ]}
  />
);

export const NotFoundErrorFallback: React.FC<{ resourceName?: string; onRetry?: () => void }> = ({ 
  resourceName = 'data', 
  onRetry 
}) => (
  <ErrorFallback
    title="No Data Found"
    description={`No ${resourceName} available at the moment.`}
    onRetry={onRetry}
    variant="default"
  />
);