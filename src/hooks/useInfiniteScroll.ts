import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  hasMore: boolean;
  loading: boolean;
}

export const useInfiniteScroll = (
  fetchMore: () => void,
  options: UseInfiniteScrollOptions
) => {
  const { threshold = 0.1, hasMore, loading } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const setTriggerRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && hasMore) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasMore && !loading) {
            fetchMore();
          }
        },
        { threshold }
      );

      observerRef.current.observe(node);
    }

    triggerRef.current = node;
  }, [fetchMore, hasMore, loading, threshold]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { triggerRef: setTriggerRef };
};