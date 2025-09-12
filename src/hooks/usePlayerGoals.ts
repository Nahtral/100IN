import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  deadline?: string;
  description?: string;
  status: string;
  created_at: string;
}

interface UsePlayerGoalsReturn {
  goals: PlayerGoal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerGoals = (playerId?: string): UsePlayerGoalsReturn => {
  const [goals, setGoals] = useState<PlayerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateSampleGoals = (playerId: string): PlayerGoal[] => {
    return [
      {
        id: `${playerId}-shooting`,
        goal_type: 'shooting_percentage',
        target_value: 75,
        current_value: 68,
        progress_percentage: 91,
        description: 'Improve shooting percentage to 75%',
        status: 'active',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: `${playerId}-fitness`,
        goal_type: 'fitness_score',
        target_value: 90,
        current_value: 82,
        progress_percentage: 91,
        description: 'Reach fitness score of 90',
        status: 'active',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: `${playerId}-consistency`,
        goal_type: 'daily_checkin',
        target_value: 30,
        current_value: 21,
        progress_percentage: 70,
        description: 'Complete 30 consecutive daily check-ins',
        status: 'active',
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];
  };

  const fetchGoals = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // For now, just use sample goals since player_goals table doesn't exist in the database
      // This will be replaced with real database query when the table is created
      const sampleGoals = generateSampleGoals(playerId);
      setGoals(sampleGoals);
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      setError(err.message || 'Failed to load goals');
      // Always provide fallback data
      const sampleGoals = generateSampleGoals(playerId);
      setGoals(sampleGoals);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [playerId]);

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals
  };
};