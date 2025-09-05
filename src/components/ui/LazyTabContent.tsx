import React, { useState, useEffect, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LazyTabContentProps {
  children: React.ReactNode;
  isActive: boolean;
  fallback?: React.ReactNode;
  delay?: number;
}

export const LazyTabContent: React.FC<LazyTabContentProps> = ({
  children,
  isActive,
  fallback,
  delay = 200
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
  }, [isActive, delay]);

  const defaultFallback = (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );

  if (!isActive) {
    return null;
  }

  if (!shouldRender) {
    return fallback || defaultFallback;
  }

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};