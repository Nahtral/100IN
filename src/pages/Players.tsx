
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PlayerForm from '@/components/forms/PlayerForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
    email: string;
    phone?: string;
  } | null;
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();
  const { currentUser } = useCurrentUser();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      // First fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;

      if (!playersData || playersData.length === 0) {
        setPlayers([]);
        return;
      }

      // Get all unique user_ids
      const userIds = [...new Set(playersData.map(player => player.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine players with their profiles
      const playersWithProfiles = playersData.map(player => ({
        ...player,
        profiles: profilesMap.get(player.user_id) || null
      }));

      setPlayers(playersWithProfiles);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to load players.",
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

  return (
    <Layout currentUser={currentUser}>
      <div className="mobile-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="mobile-title text-gray-900">Players</h1>
            <p className="text-gray-600 mobile-text">Manage your team roster</p>
          </div>
          {isSuperAdmin && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddForm} className="mobile-btn bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </DialogTitle>
              </DialogHeader>
              <PlayerForm
                onSubmit={handleSubmit}
                initialData={editingPlayer ? {
                  jerseyNumber: editingPlayer.jersey_number?.toString(),
                  position: editingPlayer.position,
                  height: editingPlayer.height,
                  weight: editingPlayer.weight,
                  dateOfBirth: editingPlayer.date_of_birth,
                  emergencyContactName: editingPlayer.emergency_contact_name,
                  emergencyContactPhone: editingPlayer.emergency_contact_phone,
                  medicalNotes: editingPlayer.medical_notes,
                } : undefined}
                isLoading={isSubmitting}
              />
            </DialogContent>
          </Dialog>
          )}
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
                <div className="overflow-x-auto">
                  <div className="mobile-table">
                    <div className="desktop-only">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Jersey #</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>ShotIQ Stats</TableHead>
                          <TableHead>Height/Weight</TableHead>
                          <TableHead>Emergency Contact</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    </div>
                    <div>
                      {players.map((player) => (
                        <div key={player.id} className="mobile-table-row">
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">Name:</span>
                            <div>
                              <p className="font-medium">{player.profiles?.full_name || 'N/A'}</p>
                              {(isSuperAdmin || player.user_id === user?.id) && (
                                <p className="text-sm text-gray-600">{player.profiles?.email}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">Jersey #:</span>
                            {player.jersey_number ? (
                              <Badge variant="outline">#{player.jersey_number}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                          
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">Position:</span>
                            {player.position ? (
                              <Badge variant="secondary">{player.position}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                          
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">ShotIQ Stats:</span>
                            <div className="text-sm space-y-1">
                              {player.total_shots && player.total_shots > 0 ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {player.shooting_percentage?.toFixed(1)}%
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {player.total_makes}/{player.total_shots}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Arc: {player.avg_arc_degrees?.toFixed(1)}° | 
                                    Depth: {player.avg_depth_inches?.toFixed(1)}"
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {player.total_sessions} sessions
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">No ShotIQ data</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">Height/Weight:</span>
                            <div className="text-sm">
                              <p>{player.height || '-'}</p>
                              <p className="text-gray-600">{player.weight || '-'}</p>
                            </div>
                          </div>
                          
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">Emergency Contact:</span>
                            {(isSuperAdmin || player.user_id === user?.id) ? (
                              <div className="text-sm">
                                <p>{player.emergency_contact_name || '-'}</p>
                                <p className="text-gray-600">{player.emergency_contact_phone || '-'}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                          
                          <div className="mobile-table-cell">
                            <span className="font-medium text-muted-foreground text-sm mobile-only">Actions:</span>
                            {isSuperAdmin ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditForm(player)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(player.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Players;
