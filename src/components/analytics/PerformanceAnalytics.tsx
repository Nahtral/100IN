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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Star
} from 'lucide-react';
import { usePerformanceAnalytics } from '@/hooks/usePerformanceAnalytics';

const PerformanceAnalytics = () => {
  const [timeframe, setTimeframe] = useState('30');
  const timeframeDays = parseInt(timeframe);
  
  const {
    averageGrade,
    gradeDistribution,
    playerPerformance,
    evaluationTrends,
    skillBreakdown,
    loading,
    error
  } = usePerformanceAnalytics(timeframeDays);

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
            <p>Error loading performance data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gradeColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'hsl(var(--primary))';
    if (grade >= 80) return 'hsl(var(--secondary))';
    if (grade >= 70) return '#f59e0b';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">Track player grades and skill development</p>
        </div>
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getGradeColor(averageGrade) }}>
              {averageGrade}
            </div>
            <p className="text-xs text-muted-foreground">
              Team performance average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playerPerformance.reduce((sum, p) => sum + p.totalEvaluations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playerPerformance.filter(p => p.averageGrade >= 90).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Players with 90+ average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improving Players</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {playerPerformance.filter(p => p.trend === 'up').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Players showing improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evaluationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [`${value}`, 'Average Grade']}
                />
                <Line 
                  type="monotone" 
                  dataKey="averageGrade" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={gradeColors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} players`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {gradeDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: gradeColors[index] }}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {item.range}: {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">Average scores and improvement trends by skill</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={skillBreakdown}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Average Score"
                    dataKey="averageScore"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {skillBreakdown.map((skill, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{skill.averageScore}/100</span>
                      {skill.improvement > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          +{skill.improvement}
                        </Badge>
                      ) : skill.improvement < 0 ? (
                        <Badge variant="destructive">
                          {skill.improvement}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No change</Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={skill.averageScore} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Player Performance</CardTitle>
          <p className="text-sm text-muted-foreground">Detailed breakdown by player</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playerPerformance.slice(0, 10).map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{player.playerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {player.totalEvaluations} evaluations
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: getGradeColor(player.averageGrade) }}>
                      {player.averageGrade}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {getTrendIcon(player.trend)}
                      <span className={player.improvementRate > 0 ? 'text-green-600' : player.improvementRate < 0 ? 'text-red-600' : 'text-gray-600'}>
                        {player.improvementRate > 0 ? '+' : ''}{player.improvementRate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceAnalytics;