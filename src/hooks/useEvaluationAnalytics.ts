import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EvaluationAnalytics {
  total_evaluations: number;
  completed_evaluations: number;
  pending_evaluations: number;
  average_scores: {
    shooting: number;
    passing: number;
    dribbling: number;
    foot_speed: number;
    vertical_jump: number;
    movement: number;
    body_alignment: number;
    overall: number;
  };
  score_trends: {
    date: string;
    shooting: number;
    passing: number;
    dribbling: number;
    overall: number;
  }[];
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  top_performers: {
    player_id: string;
    player_name: string;
    overall_score: number;
    latest_evaluation_date: string;
  }[];
  improvement_leaders: {
    player_id: string;
    player_name: string;
    improvement_percentage: number;
    evaluations_count: number;
  }[];
}

interface UseEvaluationAnalyticsReturn {
  analytics: EvaluationAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useEvaluationAnalytics = (dateRange?: { start: string; end: string }): UseEvaluationAnalyticsReturn => {
  const [analytics, setAnalytics] = useState<EvaluationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('evaluations')
        .select(`
          *,
          player:players(
            user_id,
            profiles:profiles(full_name)
          )
        `);

      // Apply date range filter if provided
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      const { data: evaluations, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Calculate analytics
      const completedEvaluations = evaluations?.filter(e => e.analysis_status === 'completed') || [];
      const pendingEvaluations = evaluations?.filter(e => e.analysis_status === 'pending') || [];

      // Calculate average scores
      const averageScores = calculateAverageScores(completedEvaluations);

      // Calculate score trends (weekly aggregates)
      const scoreTrends = calculateScoreTrends(completedEvaluations);

      // Calculate risk distribution
      const riskDistribution = calculateRiskDistribution(completedEvaluations);

      // Get top performers
      const topPerformers = getTopPerformers(completedEvaluations);

      // Get improvement leaders
      const improvementLeaders = getImprovementLeaders(completedEvaluations);

      setAnalytics({
        total_evaluations: evaluations?.length || 0,
        completed_evaluations: completedEvaluations.length,
        pending_evaluations: pendingEvaluations.length,
        average_scores: averageScores,
        score_trends: scoreTrends,
        risk_distribution: riskDistribution,
        top_performers: topPerformers,
        improvement_leaders: improvementLeaders,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch evaluation analytics';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  const calculateAverageScores = (evaluations: any[]) => {
    if (evaluations.length === 0) {
      return {
        shooting: 0,
        passing: 0,
        dribbling: 0,
        foot_speed: 0,
        vertical_jump: 0,
        movement: 0,
        body_alignment: 0,
        overall: 0,
      };
    }

    const totals = evaluations.reduce((acc, evaluation) => {
      const scores = [
        evaluation.shooting_score,
        evaluation.passing_score,
        evaluation.dribbling_score,
        evaluation.foot_speed_score,
        evaluation.vertical_jump_score,
        evaluation.movement_score,
        evaluation.body_alignment_score,
      ].filter(score => score !== null);

      return {
        shooting: acc.shooting + (evaluation.shooting_score || 0),
        passing: acc.passing + (evaluation.passing_score || 0),
        dribbling: acc.dribbling + (evaluation.dribbling_score || 0),
        foot_speed: acc.foot_speed + (evaluation.foot_speed_score || 0),
        vertical_jump: acc.vertical_jump + (evaluation.vertical_jump_score || 0),
        movement: acc.movement + (evaluation.movement_score || 0),
        body_alignment: acc.body_alignment + (evaluation.body_alignment_score || 0),
        overall: acc.overall + (scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0),
      };
    }, {
      shooting: 0,
      passing: 0,
      dribbling: 0,
      foot_speed: 0,
      vertical_jump: 0,
      movement: 0,
      body_alignment: 0,
      overall: 0,
    });

    const count = evaluations.length;
    return {
      shooting: Math.round(totals.shooting / count),
      passing: Math.round(totals.passing / count),
      dribbling: Math.round(totals.dribbling / count),
      foot_speed: Math.round(totals.foot_speed / count),
      vertical_jump: Math.round(totals.vertical_jump / count),
      movement: Math.round(totals.movement / count),
      body_alignment: Math.round(totals.body_alignment / count),
      overall: Math.round(totals.overall / count),
    };
  };

  const calculateScoreTrends = (evaluations: any[]) => {
    // Group evaluations by week and calculate average scores
    const weeklyData = new Map<string, any[]>();
    
    evaluations.forEach(evaluation => {
      const date = new Date(evaluation.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey)!.push(evaluation);
    });

    return Array.from(weeklyData.entries()).map(([date, evals]) => {
      const avgScores = calculateAverageScores(evals);
      return {
        date,
        shooting: avgScores.shooting,
        passing: avgScores.passing,
        dribbling: avgScores.dribbling,
        overall: avgScores.overall,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateRiskDistribution = (evaluations: any[]) => {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    evaluations.forEach(evaluation => {
      const riskLevel = evaluation.injury_risk_level?.toLowerCase() || '';
      if (riskLevel.includes('high')) {
        distribution.high++;
      } else if (riskLevel.includes('medium')) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    });

    return distribution;
  };

  const getTopPerformers = (evaluations: any[]) => {
    const playerScores = new Map<string, any>();
    
    evaluations.forEach(evaluation => {
      if (!evaluation.player?.profiles?.full_name) return;
      
      const playerId = evaluation.player_id;
      const scores = [
        evaluation.shooting_score,
        evaluation.passing_score,
        evaluation.dribbling_score,
        evaluation.foot_speed_score,
        evaluation.vertical_jump_score,
        evaluation.movement_score,
        evaluation.body_alignment_score,
      ].filter(score => score !== null);
      
      const overallScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      
      if (!playerScores.has(playerId) || playerScores.get(playerId).overall_score < overallScore) {
        playerScores.set(playerId, {
          player_id: playerId,
          player_name: evaluation.player.profiles.full_name,
          overall_score: Math.round(overallScore),
          latest_evaluation_date: evaluation.created_at,
        });
      }
    });

    return Array.from(playerScores.values())
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 5);
  };

  const getImprovementLeaders = (evaluations: any[]) => {
    const playerEvaluations = new Map<string, any[]>();
    
    // Group evaluations by player
    evaluations.forEach(evaluation => {
      if (!evaluation.player?.profiles?.full_name) return;
      
      const playerId = evaluation.player_id;
      if (!playerEvaluations.has(playerId)) {
        playerEvaluations.set(playerId, []);
      }
      playerEvaluations.get(playerId)!.push(evaluation);
    });

    // Calculate improvement for each player
    const improvements = Array.from(playerEvaluations.entries()).map(([playerId, evals]) => {
      if (evals.length < 2) return null;
      
      evals.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const firstEvaluation = evals[0];
      const lastEvaluation = evals[evals.length - 1];
      
      const getOverallScore = (evaluation: any) => {
        const scores = [
          evaluation.shooting_score,
          evaluation.passing_score,
          evaluation.dribbling_score,
          evaluation.foot_speed_score,
          evaluation.vertical_jump_score,
          evaluation.movement_score,
          evaluation.body_alignment_score,
        ].filter(score => score !== null);
        return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      };
      
      const firstScore = getOverallScore(firstEvaluation);
      const lastScore = getOverallScore(lastEvaluation);
      
      if (firstScore === 0) return null;
      
      const improvementPercentage = ((lastScore - firstScore) / firstScore) * 100;
      
      return {
        player_id: playerId,
        player_name: firstEvaluation.player.profiles.full_name,
        improvement_percentage: Math.round(improvementPercentage),
        evaluations_count: evals.length,
      };
    }).filter(item => item !== null && item.improvement_percentage > 0);

    return improvements
      .sort((a, b) => b!.improvement_percentage - a!.improvement_percentage)
      .slice(0, 5) as any[];
  };

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription
    const subscription = supabase
      .channel('evaluations-analytics')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'evaluations'
      }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};