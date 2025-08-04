import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Target, Activity } from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface ShotData {
  id: string;
  arc: number;
  depth: number;
  deviation: number;
  made: boolean;
  timestamp: string;
  shotType: string;
}

interface AdvancedChartsProps {
  shots: ShotData[];
}

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ shots }) => {
  const [chartType, setChartType] = useState<'scatter' | 'consistency' | 'performance' | 'radar'>('scatter');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Process data for different chart types
  const getScatterData = () => {
    return shots.map(shot => ({
      arc: shot.arc,
      makePercentage: shot.made ? 100 : 0,
      made: shot.made,
      depth: shot.depth,
      name: `Shot ${shot.id.slice(0, 8)}`,
    }));
  };

  const getConsistencyData = () => {
    const dailyStats: { [key: string]: { shots: number; made: number; avgArc: number; avgDepth: number } } = {};
    
    shots.forEach(shot => {
      const date = new Date(shot.timestamp).toLocaleDateString();
      if (!dailyStats[date]) {
        dailyStats[date] = { shots: 0, made: 0, avgArc: 0, avgDepth: 0 };
      }
      dailyStats[date].shots++;
      if (shot.made) dailyStats[date].made++;
      dailyStats[date].avgArc += shot.arc;
      dailyStats[date].avgDepth += shot.depth;
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      accuracy: (stats.made / stats.shots) * 100,
      consistency: 100 - (Math.abs(stats.avgArc / stats.shots - 45) * 2), // Ideal arc is 45°
      volume: stats.shots,
      avgArc: stats.avgArc / stats.shots,
      avgDepth: stats.avgDepth / stats.shots,
    })).slice(-30); // Last 30 days
  };

  const getPerformanceData = () => {
    const shotTypes = ['free_throw', 'catch_and_shoot', 'off_dribble', 'practice'];
    return shotTypes.map(type => {
      const typeShots = shots.filter(s => s.shotType === type);
      const made = typeShots.filter(s => s.made).length;
      return {
        shotType: type.replace('_', ' ').toUpperCase(),
        accuracy: typeShots.length > 0 ? (made / typeShots.length) * 100 : 0,
        volume: typeShots.length,
        avgArc: typeShots.length > 0 ? typeShots.reduce((sum, s) => sum + s.arc, 0) / typeShots.length : 0,
        avgDepth: typeShots.length > 0 ? typeShots.reduce((sum, s) => sum + s.depth, 0) / typeShots.length : 0,
      };
    });
  };

  const getRadarData = () => {
    const overallStats = {
      accuracy: (shots.filter(s => s.made).length / shots.length) * 100,
      arcConsistency: 100 - (shots.reduce((sum, s) => sum + Math.abs(s.arc - 45), 0) / shots.length),
      depthConsistency: 100 - (shots.reduce((sum, s) => sum + Math.abs(s.depth - 10), 0) / shots.length),
      leftRightConsistency: 100 - (shots.reduce((sum, s) => sum + Math.abs(s.deviation), 0) / shots.length) * 10,
      volume: Math.min((shots.length / 100) * 100, 100), // Normalize to 100
      improvement: 75, // This would be calculated based on trend
    };

    return [
      { subject: 'Accuracy', A: overallStats.accuracy, fullMark: 100 },
      { subject: 'Arc Consistency', A: overallStats.arcConsistency, fullMark: 100 },
      { subject: 'Depth Consistency', A: overallStats.depthConsistency, fullMark: 100 },
      { subject: 'Left/Right Consistency', A: overallStats.leftRightConsistency, fullMark: 100 },
      { subject: 'Shot Volume', A: overallStats.volume, fullMark: 100 },
      { subject: 'Improvement Trend', A: overallStats.improvement, fullMark: 100 },
    ];
  };

  const renderChart = () => {
    switch (chartType) {
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={getScatterData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="arc" 
                name="Arc (degrees)" 
                domain={[20, 70]}
                label={{ value: 'Shot Arc (degrees)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number" 
                dataKey="makePercentage" 
                name="Result" 
                domain={[0, 100]}
                label={{ value: 'Shot Result', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p>Arc: {data.arc}°</p>
                        <p>Depth: {data.depth}"</p>
                        <p>Result: {data.made ? 'Made' : 'Missed'}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                name="Made Shots" 
                dataKey="makePercentage" 
                fill="#22c55e"
                shape={(props) => props.payload.made ? 
                  <circle cx={props.cx} cy={props.cy} r="4" fill="#22c55e" /> :
                  <circle cx={props.cx} cy={props.cy} r="4" fill="#ef4444" />
                }
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'consistency':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={getConsistencyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                name="Accuracy %" 
              />
              <Line 
                type="monotone" 
                dataKey="consistency" 
                stroke="#22c55e" 
                strokeWidth={2} 
                name="Consistency Score" 
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getPerformanceData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="shotType" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy %" />
              <Bar dataKey="volume" fill="#f59e0b" name="Shot Volume" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={getRadarData()}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Performance"
                dataKey="A"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getChartTitle = () => {
    switch (chartType) {
      case 'scatter': return 'Arc vs. Shot Result Analysis';
      case 'consistency': return 'Shooting Consistency Over Time';
      case 'performance': return 'Performance by Shot Type';
      case 'radar': return 'Overall Performance Radar';
      default: return 'Analytics';
    }
  };

  const getChartIcon = () => {
    switch (chartType) {
      case 'scatter': return <Target className="h-5 w-5" />;
      case 'consistency': return <TrendingUp className="h-5 w-5" />;
      case 'performance': return <BarChart3 className="h-5 w-5" />;
      case 'radar': return <Activity className="h-5 w-5" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  if (shots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Data Available</h3>
          <p className="text-muted-foreground">Record some shots to see advanced analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            {getChartTitle()}
          </div>
          <Badge variant="outline">
            {shots.length} shots analyzed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart Controls */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Chart Type</label>
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scatter">Arc vs. Result Scatter</SelectItem>
                <SelectItem value="consistency">Consistency Trends</SelectItem>
                <SelectItem value="performance">Shot Type Performance</SelectItem>
                <SelectItem value="radar">Performance Radar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Time Range</label>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <div className="border rounded-lg p-4">
          {renderChart()}
        </div>

        {/* Chart Description */}
        <div className="text-sm text-muted-foreground">
          {chartType === 'scatter' && (
            <p>This scatter plot shows the relationship between shot arc and success rate. Green dots represent made shots, red dots represent misses. Look for patterns in your optimal shooting arc.</p>
          )}
          {chartType === 'consistency' && (
            <p>Track your accuracy and consistency over time. The consistency score is based on how close your shots are to the optimal 45° arc angle.</p>
          )}
          {chartType === 'performance' && (
            <p>Compare your shooting performance across different shot types. Use this to identify strengths and areas for improvement.</p>
          )}
          {chartType === 'radar' && (
            <p>A comprehensive view of your shooting performance across multiple dimensions. Higher values indicate better performance in each category.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedCharts;