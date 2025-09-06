
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PlayerForm from '@/components/forms/PlayerForm';
import PlayerDetailsModal from '@/components/player-details/PlayerDetailsModal';
import { TeamGridSettingsButton } from '@/components/teamgrid/TeamGridSettingsButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTeamGridSettings } from '@/hooks/useTeamGridSettings';
import BulkUserManagement from '@/components/admin/BulkUserManagement';

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
    email?: string;  // Optional since it may not always be accessible
    phone?: string;
  } | null;
  teams?: {
    name: string;
    season?: string;
  };
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin } = useOptimizedAuth();
  const { currentUser } = useCurrentUser();
  const { settings: teamGridSettings } = useTeamGridSettings();

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Effect to refetch players when settings change
  useEffect(() => {
    if (teamGridSettings) {
      fetchPlayers();
    }
  }, [teamGridSettings]);

  const fetchPlayers = async () => {
    try {
      console.log('Fetching players...');
      
      // Apply TeamGrid settings for sorting and pagination
      const sortColumn = teamGridSettings?.sort_by || 'created_at';
      const sortDirection = teamGridSettings?.sort_direction === 'desc' ? false : true;
      
      // First fetch all players with their profiles (only approved users)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          *,
          profiles!inner(
            id,
            full_name,
            email,
            phone,
            approval_status
          ),
          teams(
            name,
            season
          )
        `)
        .eq('profiles.approval_status', 'approved')
        .order(sortColumn, { ascending: sortDirection });

      console.log('Players query result:', { data: playersData, error: playersError });

      if (playersError) {
        console.error('Players fetch error:', playersError);
        throw playersError;
      }

      if (!playersData || playersData.length === 0) {
        console.log('No approved players found');
        setPlayers([]);
        return;
      }

      console.log('Final players with profiles:', playersData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: `Failed to load players: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (editingPlayer) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            jersey_number: formData.jerseyNumber,
            position: formData.position,
            height: formData.height,
            weight: formData.weight,
            date_of_birth: formData.dateOfBirth,
            emergency_contact_name: formData.emergencyContactName,
            emergency_contact_phone: formData.emergencyContactPhone,
            medical_notes: formData.medicalNotes,
          })
          .eq('id', editingPlayer.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Player updated successfully.",
        });
      } else {
        // Create new player (requires existing user profile)
        toast({
          title: "Info",
          description: "Player creation requires user registration first.",
        });
      }

      setIsFormOpen(false);
      setEditingPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: "Failed to save player.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (playerId: string) => {
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
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player.",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (player: Player) => {
    setEditingPlayer(player);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingPlayer(null);
    setIsFormOpen(true);
  };

  const openPlayerDetails = (player: Player) => {
    setSelectedPlayer(player);
    setIsDetailsOpen(true);
  };

  return (
    <Layout currentUser={currentUser}>
      <div className="mobile-space-y">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mobile-gap">
          <div className="text-center sm:text-left">
            <h1 className="mobile-title text-foreground">Players</h1>
            <p className="mobile-text text-muted-foreground">Manage your team roster</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <TeamGridSettingsButton />
            {isSuperAdmin() && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddForm} size="lg" className="w-full sm:w-auto">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Player
                  </Button>
                </DialogTrigger>
            <DialogContent className="mobile-container max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="mobile-subtitle">
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </DialogTitle>
              </DialogHeader>
              <PlayerForm
                onSubmit={handleSubmit}
                initialData={editingPlayer ? {
                  full_name: editingPlayer.profiles?.full_name || '',
                  email: editingPlayer.profiles?.email || '',
                  phone: editingPlayer.profiles?.phone || '',
                  jersey_number: editingPlayer.jersey_number || '',
                  position: editingPlayer.position,
                  height: editingPlayer.height,
                  weight: editingPlayer.weight,
                  date_of_birth: editingPlayer.date_of_birth,
                  emergency_contact_name: editingPlayer.emergency_contact_name,
                  emergency_contact_phone: editingPlayer.emergency_contact_phone,
                  medical_notes: editingPlayer.medical_notes,
                } : undefined}
                isLoading={isSubmitting}
              />
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Roster ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading players...</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No players found. Add your first player to get started.</p>
              </div>
            ) : (
                <div className="mobile-list">
                  {players.map((player) => (
                    <div 
                      key={player.id} 
                      className="mobile-list-item cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openPlayerDetails(player)}
                    >
                      {/* Mobile-first player card layout */}
                      <div className="mobile-list-header">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                            <h3 className="mobile-text font-semibold text-foreground">
                              {player.profiles?.full_name || 'N/A'}
                            </h3>
                            <div className="flex items-center gap-2">
                              {player.jersey_number && (
                                <Badge variant="outline" className="text-xs">
                                  #{player.jersey_number}
                                </Badge>
                              )}
                              {player.position && (
                                <Badge variant="secondary" className="text-xs">
                                  {player.position}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons for mobile */}
                        {isSuperAdmin() && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(player);
                              }}
                              className="touch-target"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(player.id);
                              }}
                              className="touch-target"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="mobile-list-content">
                        {/* Email (only for authorized users) */}
                        {(isSuperAdmin() || player.user_id === user?.id) && player.profiles?.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="mobile-text-sm">{player.profiles.email}</span>
                          </div>
                        )}
                        
                        {/* Physical stats */}
                        {(player.height || player.weight) && (
                          <div className="flex items-center gap-4 mobile-text-sm">
                            {player.height && <span>Height: {player.height}</span>}
                            {player.weight && <span>Weight: {player.weight}</span>}
                          </div>
                        )}
                        
                        {/* ShotIQ Stats */}
                        {player.total_shots && player.total_shots > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 mobile-text-sm">
                            <Badge variant="outline" className="text-xs">
                              {player.shooting_percentage?.toFixed(1)}% shooting
                            </Badge>
                            <span className="text-muted-foreground">
                              {player.total_makes}/{player.total_shots} shots
                            </span>
                            <span className="text-muted-foreground">
                              {player.total_sessions} sessions
                            </span>
                          </div>
                        ) : (
                          <span className="mobile-text-sm text-muted-foreground">No ShotIQ data yet</span>
                        )}
                        
                        {/* Emergency contact (only for authorized users) */}
                        {(isSuperAdmin() || player.user_id === user?.id) && (player.emergency_contact_name || player.emergency_contact_phone) && (
                          <div className="mobile-text-sm text-muted-foreground">
                            <span>Emergency: </span>
                            {player.emergency_contact_name && <span>{player.emergency_contact_name}</span>}
                            {player.emergency_contact_phone && <span> • {player.emergency_contact_phone}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk User Management - Super Admin Only */}
        {isSuperAdmin() && (
          <BulkUserManagement onPlayerCreated={fetchPlayers} />
        )}

        {/* Player Details Modal */}
        <PlayerDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          player={selectedPlayer}
          onUpdate={fetchPlayers}
        />
      </div>
    </Layout>
  );
};

export default Players;
