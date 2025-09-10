import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, Wifi } from 'lucide-react';

interface LoadingStateProps {
  variant?: 'default' | 'skeleton' | 'progress' | 'minimal' | 'spinner';
  title?: string;
  description?: string;
  progress?: number;
  currentTask?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'default',
  title,
  description,
  progress,
  currentTask,
  className
}) => {
  // Minimal loading for small components
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }
  
  // Spinner variant
  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground text-center">{description}</p>}
      </div>
    );
  }
  
  // Progress variant with progress bar
  if (variant === 'progress' && typeof progress === 'number') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {title || 'Loading'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="w-full" />
          <div className="space-y-2">
            {currentTask && (
              <p className="text-sm text-muted-foreground">{currentTask}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Skeleton variant for content placeholders
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  // Default card loading state
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title || 'Loading'}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        
        {currentTask && (
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {currentTask}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized loading components
export const DataLoadingState: React.FC<{ resourceName?: string }> = ({ 
  resourceName = 'data' 
}) => (
  <LoadingState
    variant="spinner"
    title={`Loading ${resourceName}...`}
    description="Please wait while we fetch the latest information"
  />
);

export const NetworkLoadingState: React.FC = () => (
  <LoadingState
    variant="default"
    title="Connecting..."
    description="Establishing connection to the server"
    currentTask="Please check your network connection if this takes too long"
  />
);

export const ComponentLoadingState: React.FC<{ componentName?: string }> = ({ 
  componentName = 'component' 
}) => (
  <LoadingState
    variant="minimal"
    className="my-4"
  />
);