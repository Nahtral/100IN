import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="mobile-container space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-20 flex-shrink-0" />
          ))}
        </div>

        {/* Content Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};