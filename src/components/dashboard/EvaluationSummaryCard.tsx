import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvaluationAnalytics } from '@/hooks/useEvaluationAnalytics';
import { 
  BarChart3, 
  Users, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  TrendingUp,
  Award
} from 'lucide-react';

interface EvaluationSummaryCardProps {
  dateRange?: { start: string; end: string };
  className?: string;
}

export const EvaluationSummaryCard: React.FC<EvaluationSummaryCardProps> = ({ 
  dateRange, 
  className 
}) => {
  const { analytics, loading, error } = useEvaluationAnalytics(dateRange);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evaluation Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evaluation Analytics</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || "No analytics data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Evaluation Analytics</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{analytics.total_evaluations}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center mt-1">
              <Users className="h-3 w-3 mr-1" />
              Total
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{analytics.completed_evaluations}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center mt-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{analytics.pending_evaluations}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </p>
          </div>
        </div>

        {/* Average Scores */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            Average Scores
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>Shooting:</span>
              <span className="font-medium">{analytics.average_scores.shooting}/100</span>
            </div>
            <div className="flex justify-between">
              <span>Passing:</span>
              <span className="font-medium">{analytics.average_scores.passing}/100</span>
            </div>
            <div className="flex justify-between">
              <span>Dribbling:</span>
              <span className="font-medium">{analytics.average_scores.dribbling}/100</span>
            </div>
            <div className="flex justify-between">
              <span>Movement:</span>
              <span className="font-medium">{analytics.average_scores.movement}/100</span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm font-medium">
              <span>Overall Average:</span>
              <span className="text-primary">{analytics.average_scores.overall}/100</span>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Risk Assessment
          </h4>
          <div className="flex space-x-2">
            <Badge variant="default" className="text-xs">
              Low: {analytics.risk_distribution.low}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Medium: {analytics.risk_distribution.medium}
            </Badge>
            <Badge variant="destructive" className="text-xs">
              High: {analytics.risk_distribution.high}
            </Badge>
          </div>
        </div>

        {/* Top Performer */}
        {analytics.top_performers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-1" />
              Top Performer
            </h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium text-sm">{analytics.top_performers[0].player_name}</p>
              <p className="text-xs text-muted-foreground">
                Score: {analytics.top_performers[0].overall_score}/100
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(analytics.top_performers[0].latest_evaluation_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Most Improved */}
        {analytics.improvement_leaders.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Most Improved
            </h4>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium text-sm">{analytics.improvement_leaders[0].player_name}</p>
              <p className="text-xs text-muted-foreground">
                +{analytics.improvement_leaders[0].improvement_percentage}% improvement
              </p>
              <p className="text-xs text-muted-foreground">
                {analytics.improvement_leaders[0].evaluations_count} evaluations
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};