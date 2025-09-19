import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlayerHealthData {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  team_name?: string;
  fitness_score?: number;
  injury_status?: string;
  latest_checkin?: string;
}

export const usePlayerHealthData = () => {
  const [players, setPlayers] = useState<PlayerHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get active players with their profiles
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          profiles!inner(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;

      // Get team assignments for each player
      const { data: teamData } = await supabase
        .from('player_teams')
        .select(`
          player_id,
          teams!inner(name)
        `);

      // Get latest health data for each player
      const { data: healthData } = await supabase
        .from('health_wellness')
        .select('player_id, fitness_score, injury_status')
        .order('date', { ascending: false });

      // Get latest check-ins for each player
      const { data: checkInData } = await supabase
        .from('daily_health_checkins')
        .select('player_id, check_in_date')
        .order('check_in_date', { ascending: false });

      // Combine the data
      const enrichedPlayers = playersData?.map(player => {
        const team = teamData?.find(t => t.player_id === player.id);
        const latestHealth = healthData?.find(h => h.player_id === player.id);
        const latestCheckIn = checkInData?.find(c => c.player_id === player.id);

        return {
          ...player,
          team_name: team?.teams?.name,
          fitness_score: latestHealth?.fitness_score,
          injury_status: latestHealth?.injury_status,
          latest_checkin: latestCheckIn?.check_in_date
        };
      });

      setPlayers(enrichedPlayers || []);
    } catch (err: any) {
      console.error('Error fetching player health data:', err);
      const errorMsg = err.message || 'Failed to load player health data';
      setError(errorMsg);
      
      if (err.message?.includes('permission denied')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view player health data",
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

  const deactivatePlayer = async (playerId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', playerId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Player deactivated successfully"
      });
      
      // Refresh the data
      await fetchPlayers();
    } catch (err: any) {
      console.error('Error deactivating player:', err);
      toast({
        title: "Error",
        description: "Failed to deactivate player",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return {
    players,
    loading,
    error,
    refetch: fetchPlayers,
    deactivatePlayer
  };
};