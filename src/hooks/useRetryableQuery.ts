import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

interface UseRetryableQueryOptions<T> extends RetryOptions {
  queryFn: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
  staleTime?: number;
}

interface UseRetryableQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: any;
  refetch: () => Promise<void>;
  retry: () => Promise<void>;
  retryCount: number;
  isStale: boolean;
  lastFetch: Date | null;
}

export const useRetryableQuery = <T>({
  queryFn,
  onSuccess,
  onError,
  enabled = true,
  maxRetries = 3,
  retryDelay = 1000,
  backoffMultiplier = 2,
  retryCondition = () => true,
  staleTime = 300000 // 5 minutes
}: UseRetryableQueryOptions<T>): UseRetryableQueryResult<T> => {
  const { toast } = useToast();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const isStale = lastFetch ? Date.now() - lastFetch.getTime() > staleTime : true;
  
  const executeQuery = useCallback(async (retryAttempt = 0): Promise<void> => {
    if (!enabled) return;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await queryFn();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setData(result);
      setLastFetch(new Date());
      setRetryCount(0);
      onSuccess?.(result);
      
    } catch (err: any) {
      // Don't handle aborted requests as errors
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      console.error('Query error:', err);
      setError(err);
      
      // Determine if we should retry
      const shouldRetry = retryAttempt < maxRetries && retryCondition(err);
      
      if (shouldRetry) {
        const delay = retryDelay * Math.pow(backoffMultiplier, retryAttempt);
        setRetryCount(retryAttempt + 1);
        
        // Show retry toast for user feedback
        toast({
          title: "Connection Issue",
          description: `Retrying... (${retryAttempt + 1}/${maxRetries})`,
          variant: "default",
        });
        
        timeoutRef.current = setTimeout(() => {
          executeQuery(retryAttempt + 1);
        }, delay);
      } else {
        setRetryCount(retryAttempt);
        onError?.(err);
        
        // Show final error toast
        toast({
          title: "Error",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [queryFn, enabled, maxRetries, retryDelay, backoffMultiplier, retryCondition, onSuccess, onError, toast]);
  
  const refetch = useCallback(async () => {
    await executeQuery(0);
  }, [executeQuery]);
  
  const retry = useCallback(async () => {
    await executeQuery(0);
  }, [executeQuery]);
  
  // Initial fetch
  useEffect(() => {
    if (enabled) {
      executeQuery(0);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeQuery, enabled]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    data,
    loading,
    error,
    refetch,
    retry,
    retryCount,
    isStale,
    lastFetch
  };
};

// Helper function to get user-friendly error messages
const getErrorMessage = (error: any): string => {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (error?.message?.includes('permission denied') || error?.message?.includes('unauthorized')) {
    return 'You do not have permission to access this data.';
  }
  
  if (error?.message?.includes('not found')) {
    return 'The requested information could not be found.';
  }
  
  return error?.message || 'An unexpected error occurred. Please try again.';
};

// Specialized hook for Supabase queries
export const useSupabaseQuery = <T>(options: Omit<UseRetryableQueryOptions<T>, 'retryCondition'>) => {
  return useRetryableQuery({
    ...options,
    retryCondition: (error: any) => {
      // Don't retry on authentication or permission errors
      if (error?.message?.includes('permission denied') || 
          error?.message?.includes('unauthorized') ||
          error?.message?.includes('JWT')) {
        return false;
      }
      
      // Don't retry on 404 errors
      if (error?.message?.includes('not found')) {
        return false;
      }
      
      // Retry on network errors and server errors
      return true;
    }
  });
};