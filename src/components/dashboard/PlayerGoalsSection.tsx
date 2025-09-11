import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PlayerGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  deadline?: string;
  description?: string;
  status: string;
}

interface PlayerGoalsSectionProps {
  goals: PlayerGoal[];
  loading: boolean;
  error: string | null;
}

export const PlayerGoalsSection: React.FC<PlayerGoalsSectionProps> = ({
  goals,
  loading,
  error
}) => {
  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-panther-gold" />
            Development Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-24" />
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
            <Target className="h-5 w-5 text-panther-gold" />
            Development Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Unable to load goals: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-panther-gold" />
            Development Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No active goals set
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Work with your coach to set development goals
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'shooting_percentage': return 'Shooting %';
      case 'fitness_score': return 'Fitness';
      case 'daily_checkin': return 'Check-ins';
      default: return type.replace('_', ' ');
    }
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'shooting_percentage': return Target;
      case 'fitness_score': return TrendingUp;
      case 'daily_checkin': return Calendar;
      default: return Target;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-panther-gold" />
          Development Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.map((goal) => {
            const IconComponent = getGoalTypeIcon(goal.goal_type);
            const deadline = formatDeadline(goal.deadline);
            
            return (
              <div key={goal.id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {getGoalTypeLabel(goal.goal_type)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {goal.current_value} / {goal.target_value}
                    </div>
                    {deadline && (
                      <div className="text-xs text-muted-foreground">
                        {deadline}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {goal.description}
                    </span>
                    <span className="font-medium">
                      {goal.progress_percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={goal.progress_percentage} 
                    className="h-2"
                  />
                </div>
                
                {goal.progress_percentage >= 100 && (
                  <Badge variant="default" className="text-xs">
                    Goal Completed! 🎉
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};