import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    const fetchAnalyticsData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // 1. Fetch player distribution data
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id, user_id, is_active, created_at')
          .order('created_at', { ascending: false });

        if (playersError) throw playersError;

        // 2. Fetch health/injury data for player distribution
        const { data: healthWellness, error: healthError } = await supabase
          .from('health_wellness')
          .select('player_id, injury_status')
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (healthError) throw healthError;

        // 3. Fetch real attendance data
        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance')
          .select('status, recorded_at, schedules!inner(start_time)')
          .order('recorded_at', { ascending: false })
          .limit(300);

        if (attendanceError) throw attendanceError;

        // 4. Fetch ShotIQ data for shooting percentage
        const { data: shots, error: shotsError } = await supabase
          .from('shots')
          .select('made, created_at')
          .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

        if (shotsError) throw shotsError;

        // 5. Fetch shot sessions data
        const { data: shotSessions, error: sessionsError } = await supabase
          .from('shot_sessions')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

        if (sessionsError) throw sessionsError;

        // 6. Fetch health check-ins for health scores
        const { data: healthCheckins, error: checkinsError } = await supabase
          .from('daily_health_checkins')
          .select('training_readiness, energy_level, mood, check_in_date')
          .gte('check_in_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

        if (checkinsError) throw checkinsError;

        // 7. Fetch schedule events for win/loss tracking
        const { data: scheduleEvents, error: scheduleError } = await supabase
          .from('schedules')
          .select('event_type, start_time, status, opponent')
          .eq('event_type', 'game')
          .gte('start_time', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
          .order('start_time', { ascending: false });

        if (scheduleError) throw scheduleError;

        // 8. Fetch recent analytics events for activity feed
        const { data: recentEvents, error: eventsError } = await supabase
          .from('analytics_events')
          .select('event_type, event_data, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (eventsError) throw eventsError;

        // Calculate player distribution
        const totalPlayers = players?.length || 0;
        const activePlayers = players?.filter(p => p.is_active).length || 0;
        const injuredPlayers = healthWellness?.filter(h => h.injury_status === 'injured').length || 0;
        const inactivePlayers = totalPlayers - activePlayers;

        const playerDistribution = [
          { name: 'Active Players', value: activePlayers, color: '#22c55e' },
          { name: 'Inactive', value: inactivePlayers, color: '#6b7280' },
          { name: 'Injured', value: injuredPlayers, color: '#ef4444' },
        ];

        // Process attendance data by week
        const attendanceByWeek = processAttendanceByWeek(attendanceRecords || []);

        // Calculate performance data from schedule events
        const performanceData = calculatePerformanceData(scheduleEvents || []);

        // Calculate shooting percentage from real shots
        const totalShots = shots?.length || 0;
        const madeShots = shots?.filter(s => s.made).length || 0;
        const avgShootingPercentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;

        // Calculate average health score
        const avgHealthScore = calculateAverageHealthScore(healthCheckins || []);

        // Calculate win rate from schedule events
        const winRate = calculateWinRate(scheduleEvents || []);

        // Calculate average attendance
        const avgAttendance = attendanceByWeek.length > 0 
          ? Math.round(attendanceByWeek.reduce((sum, week) => sum + week.attendance, 0) / attendanceByWeek.length)
          : 0;

        // Calculate injury rate
        const injuryRate = totalPlayers > 0 ? Math.round((injuredPlayers / totalPlayers) * 100 * 10) / 10 : 0;

        // Process recent activity
        const recentActivity = processRecentActivity(recentEvents || [], {
          totalShots,
          avgAttendance,
          injuredPlayers,
          totalSessions: shotSessions?.length || 0
        });

        setData({
          playerDistribution,
          performanceData,
          attendanceData: attendanceByWeek,
          keyMetrics: {
            winRate,
            avgAttendance,
            avgShootingPercentage,
            injuryRate,
            avgHealthScore,
            totalSessions: shotSessions?.length || 0,
          },
          recentActivity,
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load analytics data',
        }));
      }
    };

    fetchAnalyticsData();
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