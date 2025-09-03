import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ErrorLogger } from '@/utils/errorLogger';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

const DefaultErrorFallback = ({ error, retry }: { error?: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-destructive/10 border border-destructive/20 rounded-lg">
    <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
      {error?.message || 'An unexpected error occurred'}
    </p>
    <button 
      onClick={retry}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    >
      Try again
    </button>
  </div>
);

export const ErrorBoundaryWrapper = ({ children, fallback: FallbackComponent }: ErrorBoundaryWrapperProps) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    ErrorLogger.logCritical(error, {
      component: 'ErrorBoundaryWrapper',
      action: 'component_error',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });
  };

  return (
    <ErrorBoundary
      fallback={FallbackComponent || DefaultErrorFallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};