import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InjuryData {
  id: string;
  injury_status: string;
  injury_description?: string;
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

export const useInjuryData = (statusFilter?: string[]) => {
  const [injuryRecords, setInjuryRecords] = useState<InjuryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInjuryData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('health_wellness')
        .select(`
          id,
          injury_status,
          injury_description,
          date,
          medical_notes,
          players!inner(
            id,
            profiles!inner(full_name, email),
            player_teams!inner(
              teams!inner(name)
            )
          )
        `);

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('injury_status', statusFilter);
      } else {
        query = query.in('injury_status', ['injured', 'recovering']);
      }

      const { data, error: fetchError } = await query
        .order('date', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setInjuryRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching injury data:', err);
      const errorMsg = err.message || 'Failed to load injury data';
      setError(errorMsg);
      
      if (err.message?.includes('permission denied')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view injury data",
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

  const updateInjuryStatus = async (recordId: string, newStatus: string, notes?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('health_wellness')
        .update({
          injury_status: newStatus,
          medical_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Injury status updated successfully"
      });
      
      // Refresh the data
      await fetchInjuryData();
    } catch (err: any) {
      console.error('Error updating injury status:', err);
      toast({
        title: "Error",
        description: "Failed to update injury status",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInjuryData();
  }, [statusFilter]);

  return {
    injuryRecords,
    loading,
    error,
    refetch: fetchInjuryData,
    updateInjuryStatus
  };
};