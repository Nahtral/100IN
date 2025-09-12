import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerGoal {
  id: string;
  goal_type: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  priority: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  is_active: boolean;
  status: string;
  deadline?: string;
  description?: string;
}

interface UsePlayerGoalsReturn {
  goals: PlayerGoal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createGoal: (goalData: Partial<PlayerGoal>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<PlayerGoal>) => Promise<void>;
}

export const usePlayerGoals = (playerId?: string): UsePlayerGoalsReturn => {
  const [goals, setGoals] = useState<PlayerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch real goals from development_goals table
      const { data: goalsData, error: goalsError } = await supabase
        .from('development_goals')
        .select('*')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Transform database goals and calculate progress percentage
      const transformedGoals: PlayerGoal[] = (goalsData || []).map(goal => ({
        id: goal.id,
        goal_type: goal.goal_type,
        metric_name: goal.metric_name,
        target_value: goal.target_value,
        current_value: goal.current_value,
        progress_percentage: goal.target_value > 0 
          ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100)
          : 0,
        priority: goal.priority,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
        notes: goal.notes,
        is_active: goal.is_active,
        status: 'active',
        deadline: undefined,
        description: goal.notes
      }));

      // If no goals exist, create some default goals for the player
      if (transformedGoals.length === 0) {
        await createDefaultGoals(playerId);
        // Refetch after creating defaults
        const { data: newGoalsData } = await supabase
          .from('development_goals')
          .select('*')
          .eq('player_id', playerId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const newTransformedGoals = (newGoalsData || []).map(goal => ({
          id: goal.id,
          goal_type: goal.goal_type,
          metric_name: goal.metric_name,
          target_value: goal.target_value,
          current_value: goal.current_value,
          progress_percentage: goal.target_value > 0 
            ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100)
            : 0,
          priority: goal.priority,
          created_at: goal.created_at,
          updated_at: goal.updated_at,
          notes: goal.notes,
          is_active: goal.is_active,
          status: 'active',
          deadline: undefined,
          description: goal.notes
        }));

        setGoals(newTransformedGoals);
      } else {
        setGoals(transformedGoals);
      }
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultGoals = async (playerId: string) => {
    const defaultGoals = [
      {
        player_id: playerId,
        goal_type: 'shooting',
        metric_name: 'Shooting Percentage',
        target_value: 75,
        current_value: 0,
        priority: 1,
        created_by: playerId
      },
      {
        player_id: playerId,
        goal_type: 'fitness',
        metric_name: 'Fitness Score',
        target_value: 90,
        current_value: 0,
        priority: 2,
        created_by: playerId
      },
      {
        player_id: playerId,
        goal_type: 'consistency',
        metric_name: 'Daily Check-ins',
        target_value: 30,
        current_value: 0,
        priority: 2,
        created_by: playerId
      }
    ];

    try {
      const { error } = await supabase
        .from('development_goals')
        .insert(defaultGoals);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error creating default goals:', err);
    }
  };

  const createGoal = async (goalData: Partial<PlayerGoal>) => {
    if (!playerId) return;

    try {
      const { error } = await supabase
        .from('development_goals')
        .insert({
          player_id: playerId,
          goal_type: goalData.goal_type || 'general',
          metric_name: goalData.metric_name || 'General Goal',
          target_value: goalData.target_value || 100,
          current_value: goalData.current_value || 0,
          priority: goalData.priority || 2,
          created_by: playerId
        });

      if (error) throw error;
      await fetchGoals(); // Refresh goals
    } catch (err: any) {
      console.error('Error creating goal:', err);
      setError(err.message || 'Failed to create goal');
    }
  };

  const updateGoal = async (goalId: string, updates: Partial<PlayerGoal>) => {
    try {
      const { error } = await supabase
        .from('development_goals')
        .update(updates)
        .eq('id', goalId);

      if (error) throw error;
      await fetchGoals(); // Refresh goals
    } catch (err: any) {
      console.error('Error updating goal:', err);
      setError(err.message || 'Failed to update goal');
    }
  };

  useEffect(() => {
    fetchGoals();
    
    // Set up real-time subscription for goals
    const goalsChannel = supabase
      .channel('player-goals-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'development_goals', filter: `player_id=eq.${playerId}` },
        () => fetchGoals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
    };
  }, [playerId]);

  return {
    goals,
    loading,
    error,
    refetch: fetchGoals,
    createGoal,
    updateGoal
  };
};