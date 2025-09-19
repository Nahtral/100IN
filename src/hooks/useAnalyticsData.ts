import { useState, useEffect } from 'react';

interface AnalyticsData {
  playerDistribution: Array<{ name: string; value: number; color: string }>;
  performanceData: Array<{ month: string; wins: number; losses: number }>;
  attendanceData: Array<{ week: string; attendance: number }>;
  keyMetrics: {
    winRate: number;
    avgAttendance: number;
    avgShootingPercentage: number;
    injuryRate: number;
    avgHealthScore: number;
    totalSessions: number;
  };
  recentActivity: Array<{ type: string; message: string; color: string }>;
  loading: boolean;
  error: string | null;
}

export const useAnalyticsData = () => {
  const [data, setData] = useState<AnalyticsData>({
    playerDistribution: [],
    performanceData: [],
    attendanceData: [],
    keyMetrics: {
      winRate: 0,
      avgAttendance: 0,
      avgShootingPercentage: 0,
      injuryRate: 0,
      avgHealthScore: 0,
      totalSessions: 0,
    },
    recentActivity: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Simple mock data for overview - detailed analytics are in dedicated components
    setTimeout(() => {
      setData({
        playerDistribution: [
          { name: 'Active Players', value: 45, color: 'hsl(var(--primary))' },
          { name: 'Inactive', value: 8, color: 'hsl(var(--muted))' },
          { name: 'Injured', value: 3, color: 'hsl(var(--destructive))' },
        ],
        performanceData: [
          { month: 'Jan', wins: 8, losses: 2 },
          { month: 'Feb', wins: 6, losses: 4 },
          { month: 'Mar', wins: 9, losses: 1 },
          { month: 'Apr', wins: 7, losses: 3 },
        ],
        attendanceData: [
          { week: 'Week 1', attendance: 92 },
          { week: 'Week 2', attendance: 88 },
          { week: 'Week 3', attendance: 94 },
          { week: 'Week 4', attendance: 90 },
        ],
        keyMetrics: {
          winRate: 78,
          avgAttendance: 91,
          avgShootingPercentage: 67,
          injuryRate: 5.4,
          avgHealthScore: 8.3,
          totalSessions: 156,
        },
        recentActivity: [
          { type: 'training', message: 'Training session completed', color: 'hsl(var(--primary))' },
          { type: 'medical', message: 'Health check-ins updated', color: '#f59e0b' },
          { type: 'performance', message: 'Player evaluations completed', color: '#8b5cf6' },
        ],
        loading: false,
        error: null,
      });
    }, 500);
  }, []);

  return data;
};

// Helper functions for data processing
const processAttendanceByWeek = (attendanceRecords: any[]) => {
  if (!attendanceRecords.length) return [];
  
  const weekMap = new Map();
  
  attendanceRecords.forEach(record => {
    const eventDate = new Date(record.schedules?.start_time || record.recorded_at);
    const weekStart = new Date(eventDate);
    weekStart.setDate(eventDate.getDate() - eventDate.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { total: 0, present: 0 });
    }
    
    const week = weekMap.get(weekKey);
    week.total++;
    if (record.status === 'present') {
      week.present++;
    }
  });
  
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([weekKey, data], index) => ({
      week: `Week ${index + 1}`,
      attendance: Math.round((data.present / data.total) * 100) || 0
    }));
};

const calculatePerformanceData = (scheduleEvents: any[]) => {
  const monthMap = new Map();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  scheduleEvents.forEach(event => {
    const eventDate = new Date(event.start_time);
    const monthKey = eventDate.getMonth();
    const monthName = months[monthKey];
    
    if (!monthMap.has(monthName)) {
      monthMap.set(monthName, { wins: 0, losses: 0 });
    }
    
    // Simple heuristic: if opponent exists and status is "completed", assume it's a game result
    // In real implementation, you'd have actual win/loss data
    if (event.status === 'completed' && event.opponent) {
      const month = monthMap.get(monthName);
      // For demo purposes, assume 70% win rate
      if (Math.random() > 0.3) {
        month.wins++;
      } else {
        month.losses++;
      }
    }
  });
  
  // Fill last 6 months with real or calculated data
  const result = [];
  const currentMonth = new Date().getMonth();
  
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const monthName = months[monthIndex];
    const monthData = monthMap.get(monthName) || { wins: 0, losses: 0 };
    
    result.push({
      month: monthName,
      wins: monthData.wins,
      losses: monthData.losses
    });
  }
  
  return result;
};

const calculateAverageHealthScore = (healthCheckins: any[]) => {
  if (!healthCheckins.length) return 0;
  
  const scores = healthCheckins
    .map(checkin => {
      const readiness = checkin.training_readiness || 0;
      const energy = checkin.energy_level || 0;
      const mood = checkin.mood || 0;
      return (readiness + energy + mood) / 3;
    })
    .filter(score => score > 0);
  
  return scores.length > 0 
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) / 10
    : 0;
};

const calculateWinRate = (scheduleEvents: any[]) => {
  const completedGames = scheduleEvents.filter(event => 
    event.status === 'completed' && event.opponent
  );
  
  if (!completedGames.length) return 0;
  
  // For demo purposes, calculate based on event count and assume some wins
  // In real implementation, you'd have actual win/loss tracking
  const wins = Math.floor(completedGames.length * 0.65); // Assume 65% win rate
  return Math.round((wins / completedGames.length) * 100);
};

const processRecentActivity = (events: any[], metrics: any) => {
  const activities = events.slice(0, 5).map(event => {
    let message = '';
    let type = event.event_type || 'system';
    let color = getActivityColor(type);
    
    switch (event.event_type) {
      case 'shot_logged':
        message = `${metrics.totalShots} shots logged in ShotIQ`;
        type = 'training';
        break;
      case 'attendance_recorded':
        message = `Attendance recorded - ${metrics.avgAttendance}% average`;
        type = 'practice';
        break;
      case 'health_checkin':
        message = 'Daily health check-ins completed';
        type = 'medical';
        break;
      case 'player_evaluation':
        message = 'Player evaluations updated';
        type = 'performance';
        break;
      default:
        message = event.event_data?.description || 'System activity logged';
    }
    
    return { type, message, color };
  });
  
  // Add some default activities if we don't have enough real events
  const defaultActivities = [
    { type: 'training', message: `${metrics.totalSessions} training sessions completed`, color: '#3b82f6' },
    { type: 'medical', message: `${metrics.injuredPlayers} players under medical monitoring`, color: '#f59e0b' },
    { type: 'performance', message: 'Performance analytics updated', color: '#8b5cf6' },
  ];
  
  return [...activities, ...defaultActivities].slice(0, 4);
};

const getActivityColor = (category: string): string => {
  switch (category) {
    case 'game':
    case 'victory':
      return '#22c55e';
    case 'practice':
    case 'training':
      return '#3b82f6';
    case 'injury':
    case 'medical':
      return '#f59e0b';
    case 'performance':
    case 'metrics':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
};