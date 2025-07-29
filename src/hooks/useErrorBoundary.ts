import { useEffect } from 'react';
import { useAnalytics } from './useAnalytics';

export const useErrorBoundary = (componentName: string) => {
  const { track } = useAnalytics();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      track('javascript_error', {
        component: componentName,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      track('unhandled_promise_rejection', {
        component: componentName,
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [componentName, track]);

  const reportError = (error: Error, context?: Record<string, any>) => {
    track('manual_error_report', {
      component: componentName,
      message: error.message,
      stack: error.stack,
      context
    });
  };

  return { reportError };
};