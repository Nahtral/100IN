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
  // Enhanced error mapping for production readiness
  
  // Network and connectivity errors
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    return 'Request timed out. Please try again in a moment.';
  }
  
  // Authentication and authorization errors
  if (errorMessage.includes('permission denied') || errorMessage.includes('unauthorized')) {
    return 'You do not have permission to perform this action. Please contact your administrator.';
  }
  
  if (errorMessage.includes('JWT') || errorMessage.includes('token')) {
    return 'Your session has expired. Please sign in again.';
  }
  
  // Database and validation errors
  if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
    return 'The requested information could not be found.';
  }
  
  if (errorMessage.includes('duplicate') || errorMessage.includes('already exists') || errorMessage.includes('UNIQUE')) {
    return 'This information already exists in the system.';
  }
  
  if (errorMessage.includes('violates row-level security')) {
    return 'Access denied. You can only modify your own data.';
  }
  
  if (errorMessage.includes('check constraint') || errorMessage.includes('CHECK_VIOLATION')) {
    return 'The data provided does not meet system requirements.';
  }
  
  if (errorMessage.includes('foreign key') || errorMessage.includes('FOREIGN_KEY_VIOLATION')) {
    return 'Cannot complete action due to related data dependencies.';
  }
  
  // File upload and storage errors
  if (errorMessage.includes('file size') || errorMessage.includes('FILE_SIZE')) {
    return 'File is too large. Please choose a smaller file.';
  }
  
  if (errorMessage.includes('file type') || errorMessage.includes('MIME')) {
    return 'File type not supported. Please choose a different file.';
  }
  
  // Rate limiting and capacity errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  
  if (errorMessage.includes('capacity') || errorMessage.includes('quota')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  // Specific business logic errors
  if (errorMessage.includes('bulk_convert_users_to_players')) {
    return 'Failed to convert users to players. Please check user eligibility and try again.';
  }
  
  if (errorMessage.includes('ambiguous column')) {
    return 'Database configuration error. Please contact technical support.';
  }
  
  // Generic fallback with more context
  if (errorMessage.length > 100) {
    return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
  }
  
  return errorMessage;
};