import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Evaluation } from './useEvaluations';

interface PlayerEvaluationSummary {
  total_evaluations: number;
  latest_evaluation: Evaluation | null;
  average_scores: {
    shooting: number | null;
    passing: number | null;
    dribbling: number | null;
    foot_speed: number | null;
    vertical_jump: number | null;
    movement: number | null;
    body_alignment: number | null;
  };
  improvement_trend: 'improving' | 'stable' | 'declining' | null;
  risk_level: 'low' | 'medium' | 'high' | null;
}

interface UsePlayerEvaluationsReturn {
  evaluations: Evaluation[];
  summary: PlayerEvaluationSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePlayerEvaluations = (playerId?: string): UsePlayerEvaluationsReturn => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [summary, setSummary] = useState<PlayerEvaluationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlayerEvaluations = useCallback(async () => {
    if (!playerId) {
      setEvaluations([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch player evaluations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (evaluationsError) throw evaluationsError;

      setEvaluations((evaluationsData as unknown as Evaluation[]) || []);

      // Calculate summary data
      if (evaluationsData && evaluationsData.length > 0) {
        const completedEvaluations = (evaluationsData as unknown as Evaluation[]).filter(e => e.analysis_status === 'completed');
        
        const averageScores = {
          shooting: calculateAverage(completedEvaluations.map(e => e.shooting_score)),
          passing: calculateAverage(completedEvaluations.map(e => e.passing_score)),
          dribbling: calculateAverage(completedEvaluations.map(e => e.dribbling_score)),
          foot_speed: calculateAverage(completedEvaluations.map(e => e.foot_speed_score)),
          vertical_jump: calculateAverage(completedEvaluations.map(e => e.vertical_jump_score)),
          movement: calculateAverage(completedEvaluations.map(e => e.movement_score)),
          body_alignment: calculateAverage(completedEvaluations.map(e => e.body_alignment_score)),
        };

        const improvementTrend = calculateImprovementTrend(completedEvaluations);
        const riskLevel = determineRiskLevel(evaluationsData[0]);

        setSummary({
          total_evaluations: evaluationsData.length,
          latest_evaluation: (evaluationsData[0] as unknown as Evaluation) || null,
          average_scores: averageScores,
          improvement_trend: improvementTrend,
          risk_level: riskLevel,
        });
      } else {
        setSummary({
          total_evaluations: 0,
          latest_evaluation: null,
          average_scores: {
            shooting: null,
            passing: null,
            dribbling: null,
            foot_speed: null,
            vertical_jump: null,
            movement: null,
            body_alignment: null,
          },
          improvement_trend: null,
          risk_level: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch player evaluations';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [playerId, toast]);

  const calculateAverage = (scores: (number | null)[]): number | null => {
    const validScores = scores.filter((score): score is number => score !== null);
    if (validScores.length === 0) return null;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  const calculateImprovementTrend = (evaluations: Evaluation[]): 'improving' | 'stable' | 'declining' | null => {
    if (evaluations.length < 2) return null;

    const recent = evaluations.slice(0, 3);
    const older = evaluations.slice(-3);

    const recentAvg = calculateOverallScore(recent);
    const olderAvg = calculateOverallScore(older);

    if (recentAvg === null || olderAvg === null) return null;

    const difference = recentAvg - olderAvg;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  };

  const calculateOverallScore = (evaluations: Evaluation[]): number | null => {
    const scores = evaluations.map(e => {
      const validScores = [
        e.shooting_score,
        e.passing_score,
        e.dribbling_score,
        e.foot_speed_score,
        e.vertical_jump_score,
        e.movement_score,
        e.body_alignment_score,
      ].filter((score): score is number => score !== null);

      return validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
        : null;
    }).filter((score): score is number => score !== null);

    return scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : null;
  };

  const determineRiskLevel = (evaluation: any): 'low' | 'medium' | 'high' | null => {
    if (!evaluation?.injury_risk_level) return null;
    
    const riskLevel = evaluation.injury_risk_level.toLowerCase();
    if (riskLevel.includes('high')) return 'high';
    if (riskLevel.includes('medium')) return 'medium';
    return 'low';
  };

  useEffect(() => {
    fetchPlayerEvaluations();

    if (!playerId) return;

    // Set up real-time subscription for player-specific evaluations
    const subscription = supabase
      .channel(`player-evaluations-${playerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'evaluations',
        filter: `player_id=eq.${playerId}`
      }, () => {
        fetchPlayerEvaluations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPlayerEvaluations, playerId]);

  return {
    evaluations,
    summary,
    loading,
    error,
    refetch: fetchPlayerEvaluations,
  };
};