import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerEvaluations } from '@/hooks/usePlayerEvaluations';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  FileVideo,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PlayerEvaluationCardProps {
  playerId?: string;
}

export const PlayerEvaluationCard: React.FC<PlayerEvaluationCardProps> = ({ playerId }) => {
  const { summary, loading, error } = usePlayerEvaluations(playerId);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evaluation Summary</CardTitle>
          <FileVideo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evaluation Summary</CardTitle>
          <FileVideo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || "No evaluation data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (summary.improvement_trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRiskBadge = () => {
    const variant = summary.risk_level === 'high' ? 'destructive' : 
                   summary.risk_level === 'medium' ? 'secondary' : 'default';
    const icon = summary.risk_level === 'high' ? 
                 <AlertTriangle className="h-3 w-3 mr-1" /> : 
                 <CheckCircle className="h-3 w-3 mr-1" />;
    
    return (
      <Badge variant={variant} className="text-xs">
        {icon}
        {summary.risk_level || 'Low'} Risk
      </Badge>
    );
  };

  const getLatestStatus = () => {
    if (!summary.latest_evaluation) return null;
    
    const status = summary.latest_evaluation.analysis_status;
    const variant = status === 'completed' ? 'default' : 
                   status === 'processing' ? 'secondary' : 'outline';
    const icon = status === 'completed' ? 
                 <CheckCircle className="h-3 w-3 mr-1" /> : 
                 <Clock className="h-3 w-3 mr-1" />;
    
    return (
      <Badge variant={variant} className="text-xs">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const averageOverallScore = summary.average_scores 
    ? Object.values(summary.average_scores)
        .filter((score): score is number => score !== null)
        .reduce((sum, score) => sum + score, 0) / 
      Object.values(summary.average_scores).filter(score => score !== null).length
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Evaluation Summary</CardTitle>
        <FileVideo className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{summary.total_evaluations}</p>
            <p className="text-xs text-muted-foreground">Total Evaluations</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{Math.round(averageOverallScore)}/100</p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </div>
        </div>

        {/* Progress Bars for Key Metrics */}
        {summary.average_scores && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Shooting</span>
              <span>{summary.average_scores.shooting || 0}/100</span>
            </div>
            <Progress value={summary.average_scores.shooting || 0} className="h-2" />
            
            <div className="flex justify-between text-xs">
              <span>Movement</span>
              <span>{summary.average_scores.movement || 0}/100</span>
            </div>
            <Progress value={summary.average_scores.movement || 0} className="h-2" />
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className="text-xs text-muted-foreground">
              {summary.improvement_trend?.charAt(0).toUpperCase() + 
               (summary.improvement_trend?.slice(1) || 'Stable')}
            </span>
          </div>
          {getRiskBadge()}
        </div>

        {/* Latest Evaluation Status */}
        {summary.latest_evaluation && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Latest Evaluation</span>
              {getLatestStatus()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(summary.latest_evaluation.created_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};