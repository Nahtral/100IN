import React from 'react';
import { ErrorLogger } from '@/utils/errorLogger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

const DefaultErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-lg border border-border">
      <div className="text-center">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h2>
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left mb-4 text-sm bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{error.stack}</pre>
          </details>
        )}
        <button
          onClick={retry}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to our error logging service
    ErrorLogger.logCritical(error, {
      component: 'ErrorBoundary',
      action: 'component_crash',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    // Call optional onError prop
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;