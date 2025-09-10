import React, { useState, useEffect } from 'react';
import { PlayerCard } from './PlayerCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ErrorFallback, NotFoundErrorFallback } from '@/components/ui/ErrorFallback';
import { LoadingState } from '@/components/ui/LoadingState';

interface Player {
  id: string;
  user_id: string;
  team_id?: string;
  jersey_number?: number;
  position?: string;
  height?: string;
  weight?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  is_active: boolean;
  total_shots?: number;
  total_makes?: number;
  shooting_percentage?: number;
  avg_arc_degrees?: number;
  avg_depth_inches?: number;
  last_session_date?: string;
  total_sessions?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email?: string;
    phone?: string;
  } | null;
  player_teams?: {
    team_id: string;
    teams: {
      name: string;
      season?: string;
    } | null;
  }[] | null;
}

interface PlayersListProps {
  refreshTrigger?: number;
  userId?: string;
}

export const PlayersList: React.FC<PlayersListProps> = ({ refreshTrigger, userId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching players...');
      
      const { data: playersData, error } = await supabase
        .from('players')
        .select(`
          *,
          profiles(full_name, email, phone, approval_status),
          player_teams(team_id, teams(name, season))
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Players fetch error:', error);
        throw error;
      }

      // Role-based filtering  
      if (currentUser?.role === 'player' && userId) {
        const filteredData = playersData?.filter(p => p.user_id === userId) || [];
        setPlayers(filteredData as unknown as Player[]);
      } else {
        setPlayers((playersData || []) as unknown as Player[]);
      }
    } catch (error: any) {
      console.error('Error fetching players:', error);
      setError(error);
      
      // Only show toast for non-permission errors to avoid spam
      if (!error?.message?.includes('permission denied') && 
          !error?.message?.includes('row-level security')) {
        toast({
          title: "Error",
          description: `Failed to load players: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [refreshTrigger, currentUser?.role, userId]);

  const handlePlayerUpdate = () => {
    fetchPlayers();
  };

  const handlePlayerDelete = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player deleted successfully.",
      });
      
      fetchPlayers();
    } catch (error: any) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <LoadingState
        variant="skeleton" 
        title="Loading Players"
        description="Fetching player information..."
      />
    );
  }

  if (error) {
    return (
      <ErrorFallback
        error={error}
        title="Failed to Load Players"
        onRetry={() => fetchPlayers()}
        showDetails={process.env.NODE_ENV === 'development'}
        actions={[
          { 
            label: 'Refresh Page', 
            onClick: () => window.location.reload(), 
            variant: 'outline' 
          }
        ]}
      />
    );
  }

  if (players.length === 0) {
    return (
      <NotFoundErrorFallback
        resourceName="players"
        onRetry={() => fetchPlayers()}
      />
    );
  }

  return (
    <div className="mobile-list">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          onUpdate={handlePlayerUpdate}
          onDelete={handlePlayerDelete}
          currentUser={currentUser}
          userId={userId}
        />
      ))}
    </div>
  );
};