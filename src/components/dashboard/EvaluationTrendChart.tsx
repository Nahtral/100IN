import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvaluationAnalytics } from '@/hooks/useEvaluationAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface EvaluationTrendChartProps {
  playerId?: string;
  dateRange?: { start: string; end: string };
  className?: string;
}

export const EvaluationTrendChart: React.FC<EvaluationTrendChartProps> = ({ 
  playerId, 
  dateRange, 
  className 
}) => {
  const { analytics, loading, error } = useEvaluationAnalytics(dateRange);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evaluation Trends</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics?.score_trends || analytics.score_trends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Evaluation Trends</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {error || "No trend data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Evaluation Trends</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={analytics.score_trends}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-xs"
            />
            <YAxis 
              domain={[0, 100]}
              className="text-xs"
            />
            <Tooltip 
              labelFormatter={(date) => `Week of ${formatDate(date as string)}`}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}`, 
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="overall" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Overall"
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="shooting" 
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              name="Shooting"
              dot={{ fill: "hsl(142, 76%, 36%)", strokeWidth: 2, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="passing" 
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              name="Passing"
              dot={{ fill: "hsl(221, 83%, 53%)", strokeWidth: 2, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="dribbling" 
              stroke="hsl(262, 83%, 58%)"
              strokeWidth={2}
              name="Dribbling"
              dot={{ fill: "hsl(262, 83%, 58%)", strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Key Insights */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Latest Average</p>
            <p className="text-muted-foreground">
              {analytics.score_trends.length > 0 
                ? analytics.score_trends[analytics.score_trends.length - 1].overall.toFixed(1)
                : 'N/A'}/100
            </p>
          </div>
          <div>
            <p className="font-medium">Trend Direction</p>
            <p className="text-muted-foreground">
              {analytics.score_trends.length >= 2 
                ? (analytics.score_trends[analytics.score_trends.length - 1].overall > 
                   analytics.score_trends[analytics.score_trends.length - 2].overall 
                   ? '↗ Improving' : '↘ Declining')
                : 'Stable'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};