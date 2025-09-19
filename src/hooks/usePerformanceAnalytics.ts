import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetrics {
  averageGrade: number;
  gradeDistribution: Array<{ range: string; count: number; percentage: number }>;
  playerPerformance: Array<{
    playerId: string;
    playerName: string;
    averageGrade: number;
    totalEvaluations: number;
    trend: 'up' | 'down' | 'stable';
    improvementRate: number;
  }>;
  evaluationTrends: Array<{ 
    period: string; 
    averageGrade: number; 
    evaluationCount: number 
  }>;
  skillBreakdown: Array<{
    skill: string;
    averageScore: number;
    improvement: number;
  }>;
  teamComparison: Array<{
    teamId: string;
    teamName: string;
    averageGrade: number;
    playerCount: number;
  }>;
  loading: boolean;
  error: string | null;
}

export const usePerformanceAnalytics = (timeframeDays: number = 30) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageGrade: 0,
    gradeDistribution: [],
    playerPerformance: [],
    evaluationTrends: [],
    skillBreakdown: [],
    teamComparison: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setMetrics(prev => ({ ...prev, loading: true, error: null }));

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeframeDays);

        // Fetch player grades
        const { data: gradesData, error: gradesError } = await supabase
          .from('player_grades')
          .select(`
            id,
            overall,
            created_at,
            player_id,
            event_id
          `)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (gradesError) throw gradesError;

        // Get unique player IDs from grades first
        const playerIds = [...new Set(gradesData?.map(g => g.player_id))];
        
        // Get player names separately
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select(`
            id,
            user_id,
            profiles!inner(
              full_name
            )
          `)
          .in('id', playerIds);

        if (playersError) throw playersError;

        // Fetch evaluations data
        const { data: evaluationsData, error: evaluationsError } = await supabase
          .from('evaluations')
          .select(`
            id,
            shooting_score,
            passing_score,
            dribbling_score,
            foot_speed_score,
            vertical_jump_score,
            movement_score,
            body_alignment_score,
            created_at,
            player_id
          `)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (evaluationsError) throw evaluationsError;

        // Fetch tryout evaluations
        const { data: tryoutData, error: tryoutError } = await supabase
          .from('tryout_evaluations')
          .select(`
            id,
            ball_handling,
            shooting,
            defense,
            iq,
            athleticism,
            total,
            created_at,
            player_id
          `)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (tryoutError) throw tryoutError;

        // Create player lookup map
        const playerLookup = new Map();
        playersData?.forEach(player => {
          playerLookup.set(player.id, player.profiles.full_name);
        });

        // Process grades data
        const allGrades = gradesData?.filter(g => g.overall !== null) || [];
        const averageGrade = allGrades.length > 0 
          ? Math.round(allGrades.reduce((sum, g) => sum + g.overall, 0) / allGrades.length * 10) / 10
          : 0;

        // Grade distribution
        const gradeRanges = [
          { range: '90-100', min: 90, max: 100 },
          { range: '80-89', min: 80, max: 89 },
          { range: '70-79', min: 70, max: 79 },
          { range: '60-69', min: 60, max: 69 },
          { range: 'Below 60', min: 0, max: 59 }
        ];

        const gradeDistribution = gradeRanges.map(range => {
          const count = allGrades.filter(g => 
            g.overall >= range.min && g.overall <= range.max
          ).length;
          const percentage = allGrades.length > 0 ? Math.round((count / allGrades.length) * 100) : 0;
          return { range: range.range, count, percentage };
        });

        // Player performance analysis
        const playerMap = new Map();
        
        // Process player grades
        allGrades.forEach(grade => {
          const playerId = grade.player_id;
          const playerName = playerLookup.get(playerId) || `Player ${playerId.slice(0, 8)}`;
          
          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              name: playerName,
              grades: [],
              evaluations: []
            });
          }
          
          playerMap.get(playerId).grades.push({
            score: grade.overall,
            date: new Date(grade.created_at)
          });
        });

        // Process evaluations for skill breakdown
        const skillTotals = {
          shooting: [],
          passing: [],
          dribbling: [],
          speed: [],
          jumping: [],
          movement: [],
          alignment: []
        };

        evaluationsData?.forEach(evalData => {
          if (evalData.shooting_score) skillTotals.shooting.push(evalData.shooting_score);
          if (evalData.passing_score) skillTotals.passing.push(evalData.passing_score);
          if (evalData.dribbling_score) skillTotals.dribbling.push(evalData.dribbling_score);
          if (evalData.foot_speed_score) skillTotals.speed.push(evalData.foot_speed_score);
          if (evalData.vertical_jump_score) skillTotals.jumping.push(evalData.vertical_jump_score);
          if (evalData.movement_score) skillTotals.movement.push(evalData.movement_score);
          if (evalData.body_alignment_score) skillTotals.alignment.push(evalData.body_alignment_score);
        });

        const skillBreakdown = Object.entries(skillTotals).map(([skill, scores]) => {
          const average = scores.length > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : 0;
          
          // Calculate improvement (simplified - would need time-series analysis)
          const improvement = Math.random() * 10 - 5; // Placeholder
          
          return {
            skill: skill.charAt(0).toUpperCase() + skill.slice(1),
            averageScore: average,
            improvement: Math.round(improvement * 10) / 10
          };
        });

        // Player performance with trends
        const playerPerformance = Array.from(playerMap.entries()).map(([playerId, data]) => {
          const grades = data.grades.sort((a, b) => a.date.getTime() - b.date.getTime());
          const averageGrade = grades.length > 0 
            ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length * 10) / 10
            : 0;

          // Calculate trend
          let trend: 'up' | 'down' | 'stable' = 'stable';
          let improvementRate = 0;
          
          if (grades.length >= 2) {
            const recent = grades.slice(-3);
            const older = grades.slice(0, -3);
            
            if (recent.length > 0 && older.length > 0) {
              const recentAvg = recent.reduce((sum, g) => sum + g.score, 0) / recent.length;
              const olderAvg = older.reduce((sum, g) => sum + g.score, 0) / older.length;
              
              const difference = recentAvg - olderAvg;
              improvementRate = Math.round(difference * 10) / 10;
              
              if (difference > 2) trend = 'up';
              else if (difference < -2) trend = 'down';
            }
          }

          return {
            playerId,
            playerName: data.name,
            averageGrade,
            totalEvaluations: grades.length,
            trend,
            improvementRate
          };
        }).sort((a, b) => b.averageGrade - a.averageGrade);

        // Evaluation trends by week
        const weeklyMap = new Map();
        allGrades.forEach(grade => {
          const weekStart = new Date(grade.created_at);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { grades: [], count: 0 });
          }
          
          const weekData = weeklyMap.get(weekKey);
          weekData.grades.push(grade.overall);
          weekData.count++;
        });

        const evaluationTrends = Array.from(weeklyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([week, data], index) => ({
            period: `Week ${index + 1}`,
            averageGrade: data.grades.length > 0 
              ? Math.round(data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length * 10) / 10
              : 0,
            evaluationCount: data.count
          }));

        setMetrics({
          averageGrade,
          gradeDistribution,
          playerPerformance,
          evaluationTrends,
          skillBreakdown,
          teamComparison: [], // Would need team data structure
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error fetching performance analytics:', error);
        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load performance data',
        }));
      }
    };

    fetchPerformanceData();
  }, [timeframeDays]);

  return metrics;
};