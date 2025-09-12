import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShotAnalytics } from '@/hooks/useShotAnalytics';

interface ShotAnalyticsCardProps {
  analytics: ShotAnalytics | null;
  loading: boolean;
  error: string | null;
}

export const ShotAnalyticsCard: React.FC<ShotAnalyticsCardProps> = ({
  analytics,
  loading,
  error
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Shot Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Shot Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {error || 'No shot data available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  const getArcQuality = (arc: number) => {
    if (arc >= 40 && arc <= 50) return { label: 'Optimal', color: 'bg-green-100 text-green-800' };
    if (arc < 40) return { label: 'Too Low', color: 'bg-red-100 text-red-800' };
    return { label: 'Too High', color: 'bg-yellow-100 text-yellow-800' };
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-panthers-red" />
          Shot Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analytics.shootingPercentage.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              {analytics.madeShots}/{analytics.totalShots} made
            </p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getConsistencyColor(analytics.consistencyScore)}`}>
              {analytics.consistencyScore.toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground">Consistency</p>
          </div>
        </div>

        {/* Shot Mechanics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Shot Mechanics</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="font-semibold">{analytics.averageArc.toFixed(1)}°</div>
              <Badge variant="outline" className={getArcQuality(analytics.averageArc).color}>
                {getArcQuality(analytics.averageArc).label}
              </Badge>
            </div>
            <div className="text-center">
              <div className="font-semibold">{analytics.averageDepth.toFixed(1)}"</div>
              <p className="text-muted-foreground">Depth</p>
            </div>
            <div className="text-center">
              <div className="font-semibold">{analytics.averageDeviation.toFixed(1)}"</div>
              <p className="text-muted-foreground">L/R Dev</p>
            </div>
          </div>
        </div>

        {/* Arc Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Arc Distribution</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Optimal (40-50°)</span>
              <span>{analytics.arcAnalysis.optimal} shots</span>
            </div>
            <Progress 
              value={(analytics.arcAnalysis.optimal / analytics.totalShots) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low: {analytics.arcAnalysis.low}</span>
              <span>High: {analytics.arcAnalysis.high}</span>
            </div>
          </div>
        </div>

        {/* Shot Range Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Range Distribution</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{analytics.shotDistribution.closeRange}</div>
              <p className="text-xs text-muted-foreground">Close</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{analytics.shotDistribution.midRange}</div>
              <p className="text-xs text-muted-foreground">Mid</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{analytics.shotDistribution.longRange}</div>
              <p className="text-xs text-muted-foreground">Long</p>
            </div>
          </div>
        </div>

        {/* Improvement Trend */}
        <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
          <div className="flex items-center gap-2">
            {getTrendIcon(analytics.improvementTrend)}
            <span className="text-sm font-medium">Trend</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">
              {analytics.improvementTrend > 0 ? '+' : ''}{analytics.improvementTrend.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">vs previous</p>
          </div>
        </div>

        {/* Best Session */}
        {analytics.bestSession && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Best Session</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(analytics.bestSession.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {analytics.bestSession.percentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.bestSession.shots} shots
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};