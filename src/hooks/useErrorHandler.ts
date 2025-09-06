import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export const useErrorHandler = (defaultContext?: ErrorContext) => {
  const { toast } = useToast();
  const { track } = useAnalytics();

  const handleError = useCallback((error: Error | string, context?: ErrorContext) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    const fullContext = { ...defaultContext, ...context };
    
    // Log error for analytics
    track('error_occurred', {
      message: errorMessage,
      stack: errorStack,
      component: fullContext.component,
      action: fullContext.action,
      userId: fullContext.userId,
      timestamp: new Date().toISOString(),
      ...fullContext.additionalData
    });

    // Show user-friendly error message
    toast({
      title: "Something went wrong",
      description: getUserFriendlyMessage(errorMessage),
      variant: "destructive",
    });

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error, 'Context:', fullContext);
    }
  }, [toast, track, defaultContext]);

  const handleAsyncError = useCallback(async (
    asyncOperation: () => Promise<any>,
    context?: ErrorContext
  ) => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error as Error, context);
      throw error; // Re-throw so calling code can handle if needed
    }
  }, [handleError]);

  return { handleError, handleAsyncError };
};

const getUserFriendlyMessage = (errorMessage: string): string => {
  // Map technical errors to user-friendly messages
  if (errorMessage.includes('Failed to fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (errorMessage.includes('permission denied') || errorMessage.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (errorMessage.includes('not found')) {
    return 'The requested information was not found.';
  }
  
  if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
    return 'This information already exists in the system.';
  }
  
  // Return original message if no mapping found, but sanitized
  return errorMessage.length > 100 
    ? 'An unexpected error occurred. Please try again.' 
    : errorMessage;
};