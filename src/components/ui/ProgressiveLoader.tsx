import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ProgressiveLoaderProps {
  currentTask: string | null;
  progress: number;
  isComplete: boolean;
  error: string | null;
  className?: string;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  currentTask,
  progress,
  isComplete,
  error,
  className
}) => {
  if (isComplete && !error) {
    return null; // Hide when complete
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {error ? (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" />
              Loading Failed
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready
            </>
          ) : (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Dashboard
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <>
            <Progress value={progress} className="w-full" />
            {currentTask && (
              <p className="text-sm text-muted-foreground">{currentTask}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};