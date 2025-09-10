import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  season?: string;
}

interface Player {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface TeamWithPlayers extends Team {
  players: Player[];
}

export const useEventTeamsAndPlayers = (teamIds: string[] | undefined) => {
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTeamsAndPlayers = async () => {
    if (!teamIds || teamIds.length === 0) {
      setTeams([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, season')
        .in('id', teamIds);

      if (teamsError) throw teamsError;

      // Fetch players for these teams through the junction table
      const { data: playersData, error: playersError } = await supabase
        .from('player_teams')
        .select(`
          team_id,
          player_id,
          players!inner(
            id,
            user_id,
            jersey_number,
            position,
            is_active,
            profiles!inner(
              full_name,
              email
            )
          )
        `)
        .in('team_id', teamIds)
        .eq('is_active', true)
        .eq('players.is_active', true);

      if (playersError) throw playersError;

      // Group players by team
      const teamsWithPlayers: TeamWithPlayers[] = (teamsData || []).map(team => ({
        ...team,
        players: (playersData || [])
          .filter(pt => pt.team_id === team.id)
          .map(pt => pt.players)
          .filter(Boolean)
      }));

      setTeams(teamsWithPlayers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team and player data';
      setError(errorMessage);
      console.error('Error fetching teams and players:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndPlayers();
  }, [teamIds]);

  return {
    teams,
    loading,
    error,
    refetch: fetchTeamsAndPlayers
  };
};