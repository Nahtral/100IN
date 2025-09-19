import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FitnessData {
  id: string;
  fitness_score: number;
  date: string;
  medical_notes?: string;
  players: {
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
    player_teams: Array<{
      teams: {
        name: string;
      };
    }>;
  };
}

export const useFitnessData = (minScore?: number) => {
  const [fitnessRecords, setFitnessRecords] = useState<FitnessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFitnessData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('health_wellness')
        .select(`
          id,
          fitness_score,
          date,
          medical_notes,
          players!inner(
            id,
            profiles!inner(full_name, email),
            player_teams!inner(
              teams!inner(name)
            )
          )
        `)
        .not('fitness_score', 'is', null);

      if (minScore !== undefined) {
        query = query.gte('fitness_score', minScore);
      }

      const { data, error: fetchError } = await query
        .order('date', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setFitnessRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching fitness data:', err);
      const errorMsg = err.message || 'Failed to load fitness data';
      setError(errorMsg);
      
      if (err.message?.includes('permission denied')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view fitness data",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFitnessRecord = async (recordId: string, updates: Partial<Pick<FitnessData, 'fitness_score' | 'medical_notes'>>) => {
    try {
      const { error: updateError } = await supabase
        .from('health_wellness')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Fitness record updated successfully"
      });
      
      // Refresh the data
      await fetchFitnessData();
    } catch (err: any) {
      console.error('Error updating fitness record:', err);
      toast({
        title: "Error",
        description: "Failed to update fitness record",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchFitnessData();
  }, [minScore]);

  return {
    fitnessRecords,
    loading,
    error,
    refetch: fetchFitnessData,
    updateFitnessRecord
  };
};