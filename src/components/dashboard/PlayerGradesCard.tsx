import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PlayerGrade {
  id: string;
  overall_grade: number;
  event_type: string;
  created_at: string;
  schedules?: {
    title: string;
    start_time: string;
  };
}

interface PlayerGradesCardProps {
  grades: PlayerGrade[];
  loading?: boolean;
}

const PlayerGradesCard: React.FC<PlayerGradesCardProps> = ({ grades, loading }) => {
  const recentGrades = grades.slice(0, 5);
  const averageGrade = grades.length > 0 
    ? grades.reduce((sum, grade) => sum + grade.overall_grade, 0) / grades.length 
    : 0;

  const getGradeColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getGradeTrend = () => {
    if (grades.length < 2) return null;
    const recent = grades.slice(0, 3);
    const older = grades.slice(3, 6);
    
    if (recent.length === 0 || older.length === 0) return null;
    
    const recentAvg = recent.reduce((sum, g) => sum + g.overall_grade, 0) / recent.length;
    const olderAvg = older.reduce((sum, g) => sum + g.overall_grade, 0) / older.length;
    
    return recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
  };

  const trend = getGradeTrend();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Performance Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Performance Grades
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              <TrendingUp 
                className={`h-4 w-4 ${
                  trend === 'improving' ? 'text-green-500' : 
                  trend === 'declining' ? 'text-red-500' : 'text-gray-500'
                }`} 
              />
              <span className={`text-sm font-medium ${
                trend === 'improving' ? 'text-green-600' : 
                trend === 'declining' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend === 'improving' ? 'Improving' : 
                 trend === 'declining' ? 'Needs Focus' : 'Stable'}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {grades.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Grades Yet</h3>
            <p className="text-muted-foreground text-sm">
              Your coach will grade your performance after training sessions and games.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Average */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">Overall Average</span>
              <Badge className={getGradeColor(averageGrade)}>
                {averageGrade.toFixed(1)}/10
              </Badge>
            </div>

            {/* Recent Grades */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Recent Performance</h4>
              {recentGrades.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between p-2 border border-border rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {grade.schedules?.title || 'Training Session'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {grade.schedules?.start_time 
                        ? format(new Date(grade.schedules.start_time), 'MMM d, yyyy')
                        : format(new Date(grade.created_at), 'MMM d, yyyy')
                      }
                      <Badge variant="outline" className="text-xs">
                        {grade.event_type}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={getGradeColor(grade.overall_grade)}>
                    {grade.overall_grade.toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerGradesCard;