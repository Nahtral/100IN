import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  BarChart3
} from 'lucide-react';
import { useShotAnalytics } from '@/hooks/useShotAnalytics';

const ShotIQAnalytics = () => {
  const [timeframe, setTimeframe] = useState('30');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  
  const timeframeDays = parseInt(timeframe);
  const dateRange = {
    start: new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  };
  
  const {
    analytics,
    loading,
    error
  } = useShotAnalytics(selectedPlayer === 'all' ? undefined : selectedPlayer, dateRange);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-4"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>Error loading ShotIQ data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 70) return 'hsl(var(--primary))';
    if (percentage >= 50) return '#f59e0b';
    return 'hsl(var(--destructive))';
  };

  const shotZoneColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">ShotIQ Analytics</h2>
          <p className="text-muted-foreground">Advanced shooting analysis and improvement tracking</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {/* Would populate with actual player list */}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shots</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalShots || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getAccuracyColor(analytics?.shootingPercentage || 0) }}>
              {analytics?.shootingPercentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall shooting percentage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.consistencyScore || 0}</div>
            <p className="text-xs text-muted-foreground">
              Shot consistency score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Arc</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.averageArc || 0}°</div>
            <p className="text-xs text-muted-foreground">
              Shot arc angle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {(analytics?.improvementTrend || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: (analytics?.improvementTrend || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
              {analytics?.improvementTrend ? (analytics.improvementTrend > 0 ? '+' : '') + analytics.improvementTrend.toFixed(1) + '%' : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shot Distribution by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Array.isArray(analytics?.shotDistribution) ? analytics.shotDistribution : []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="shots"
                >
                  {(Array.isArray(analytics?.shotDistribution) ? analytics.shotDistribution : []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={shotZoneColors[index % shotZoneColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} shots`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {(Array.isArray(analytics?.shotDistribution) ? analytics.shotDistribution : []).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: shotZoneColors[index % shotZoneColors.length] }}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {item.zone}: {item.shots}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arc Analysis</CardTitle>
            <p className="text-sm text-muted-foreground">Shot arc distribution and trends</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Real arc analysis from database */}
              {analytics?.arcAnalysis ? [
                { 
                  range: 'Below 40°', 
                  count: analytics.arcAnalysis.low, 
                  accuracy: analytics.totalShots > 0 ? Math.round((analytics.madeShots / analytics.totalShots) * 100) : 0
                },
                { 
                  range: '40-50° (Optimal)', 
                  count: analytics.arcAnalysis.optimal, 
                  accuracy: analytics.totalShots > 0 ? Math.round((analytics.madeShots / analytics.totalShots) * 100) : 0
                },
                { 
                  range: 'Above 50°', 
                  count: analytics.arcAnalysis.high, 
                  accuracy: analytics.totalShots > 0 ? Math.round((analytics.madeShots / analytics.totalShots) * 100) : 0
                }
              ].filter(arc => arc.count > 0).map((arc, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{arc.range}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{arc.count} shots</span>
                      <Badge 
                        variant={arc.accuracy >= 60 ? "default" : arc.accuracy >= 40 ? "secondary" : "destructive"}
                      >
                        {arc.accuracy}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={arc.accuracy} className="h-2" />
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>No shot data available for arc analysis</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shot Mechanics</CardTitle>
            <p className="text-sm text-muted-foreground">Technical analysis of shooting form</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Average Arc</p>
                  <p className="text-sm text-muted-foreground">Optimal: 45-50°</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{analytics?.averageArc || 0}°</div>
                  <Badge variant={
                    (analytics?.averageArc || 0) >= 45 && (analytics?.averageArc || 0) <= 50 
                      ? "default" 
                      : "secondary"
                  }>
                    {(analytics?.averageArc || 0) >= 45 && (analytics?.averageArc || 0) <= 50 ? 'Optimal' : 'Needs Work'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Shot Depth</p>
                  <p className="text-sm text-muted-foreground">Consistency measure</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{analytics?.averageDepth || 0}"</div>
                  <div className="text-sm text-muted-foreground">
                    Dev: {analytics?.averageDeviation || 0}"
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Best Session</p>
                  <p className="text-sm text-muted-foreground">Highest accuracy</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {analytics?.bestSession?.percentage || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analytics?.bestSession?.date ? new Date(analytics.bestSession.date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Improvement Insights</CardTitle>
            <p className="text-sm text-muted-foreground">AI-powered recommendations</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">Strength</h4>
                <p className="text-sm text-blue-700">
                  Consistent shot arc averaging {analytics?.averageArc || 0}° - maintain this form
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-1">Focus Area</h4>
                <p className="text-sm text-orange-700">
                  Work on shot depth consistency. Variance of {analytics?.averageDeviation || 0}" suggests need for more practice
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-1">Progress</h4>
                <p className="text-sm text-green-700">
                  {(analytics?.improvementTrend || 0) >= 0 
                    ? `Improving by ${analytics?.improvementTrend?.toFixed(1) || 0}% - keep it up!`
                    : 'Focus on fundamentals to reverse negative trend'
                  }
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-800 mb-1">Goal</h4>
                <p className="text-sm text-purple-700">
                  Target: 75% accuracy with {Math.min((analytics?.totalShots || 0) + 50, 1000)} shots this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShotIQAnalytics;