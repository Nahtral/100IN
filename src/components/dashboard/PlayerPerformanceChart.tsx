import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataQualityIndicator } from '@/components/ui/data-quality-indicator';
import { DataInputPrompt } from '@/components/ui/data-input-prompt';

interface PerformanceData {
  id: string;
  date: string;
  points: number;
  made_shots: number;
  total_shots: number;
  percentage: number;
  opponent?: string;
}

interface PlayerPerformanceChartProps {
  performance: PerformanceData[];
  loading: boolean;
  error: string | null;
}

export const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({
  performance,
  loading,
  error
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-panther-blue" />
            Recent Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-panther-blue" />
            Recent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Unable to load performance data: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!performance || performance.length === 0) {
    return (
      <DataInputPrompt
        dataType="Performance Data"
        message="Track your training sessions and games to see detailed performance trends and analytics."
        actionLabel="Start Training Session"
        onAction={() => window.location.href = '/shotiq'}
        priority="medium"
        suggestions={['Record shots', 'Log game stats', 'Track improvement']}
        className="col-span-full"
      />
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPerformanceBadge = (percentage: number, points: number) => {
    if (percentage >= 70 && points >= 10) return { label: 'Excellent', variant: 'default' as const };
    if (percentage >= 50 && points >= 6) return { label: 'Good', variant: 'secondary' as const };
    if (percentage >= 30 || points >= 3) return { label: 'Average', variant: 'outline' as const };
    return { label: 'Needs Work', variant: 'destructive' as const };
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-panther-blue" />
            Recent Performance
          </CardTitle>
          <DataQualityIndicator
            totalRecords={performance.length}
            sourceType="performance record"
            confidence={performance.length >= 10 ? 'high' : performance.length >= 5 ? 'medium' : 'low'}
            lastUpdated={performance[0]?.date}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performance.map((session, index) => {
            const badge = getPerformanceBadge(session.percentage, session.points);
            return (
              <div 
                key={session.id} 
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">
                      {session.opponent ? `vs ${session.opponent}` : 'Training Session'}
                    </p>
                    <Badge variant={badge.variant} className="text-xs">
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="mobile-text-sm text-muted-foreground">
                    {session.points} points • {session.made_shots}/{session.total_shots} shots ({session.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="mobile-text-sm font-medium text-muted-foreground">
                    {formatDate(session.date)}
                  </p>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {session.points}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};