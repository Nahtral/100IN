import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Calendar, Trophy, BarChart3, Settings, UserPlus, Edit, Trash2, Archive, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedTeamForm from '@/components/forms/EnhancedTeamForm';
import PlayerSelectionForm from '@/components/forms/PlayerSelectionForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Player {
  id: string;
  jersey_number?: number;
  position?: string;
  is_active: boolean;
  user_id?: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  } | null;
}

interface TeamDetailsModalProps {
  team: any;
  isOpen: boolean;
  onClose: () => void;
  onTeamUpdate: () => void;
}

const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  team,
  isOpen,
  onClose,
  onTeamUpdate
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddPlayerMode, setIsAddPlayerMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = useOptimizedAuth();

  useEffect(() => {
    if (isOpen && team) {
      fetchTeamPlayers();
    }
  }, [isOpen, team]);

  const fetchTeamPlayers = async () => {
    try {
      setIsLoading(true);
      
      // Get players for this team using the player_teams junction table
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          id, jersey_number, position, is_active, user_id, 
          manual_entry_name, manual_entry_email, manual_entry_phone,
          player_teams!inner(assigned_at, is_active)
        `)
        .eq('player_teams.team_id', team.id)
        .eq('player_teams.is_active', true)
        .order('jersey_number', { ascending: true });

      if (playersError) throw playersError;

      // Then get profile information for each player (only for those with user_id)
      const playersWithProfiles = await Promise.all(
        (playersData || []).map(async (player) => {
          if (player.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', player.user_id)
              .single();
            
            return {
              ...player,
              profiles: profile
            };
          }
          // For manual entries, create a mock profile from manual entry data
          return {
            ...player,
            profiles: {
              full_name: player.manual_entry_name,
              avatar_url: null
            }
          };
        })
      );

      setPlayers(playersWithProfiles);
    } catch (error) {
      console.error('Error fetching team players:', error);
      toast({
        title: "Error",
        description: "Failed to load team players",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async (data: any) => {
    if (!team) return;
    
    setIsSubmitting(true);
    try {
      // Create player record first
      const playerData = {
        user_id: data.selected_user_id || null,
        jersey_number: data.jersey_number ? parseInt(data.jersey_number.toString()) : null,
        position: data.position || null,
        height: data.height || null,
        weight: data.weight || null,
        date_of_birth: data.date_of_birth || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        medical_notes: data.medical_notes || null,
        is_active: true,
        // Store manual entry data if no user_id (manual entry)
        manual_entry_name: !data.selected_user_id ? data.full_name : null,
        manual_entry_email: !data.selected_user_id ? data.email : null,
        manual_entry_phone: !data.selected_user_id ? data.phone : null,
      };

      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert(playerData)
        .select('id')
        .single();

      if (playerError) throw playerError;

      // Create team assignment in player_teams junction table
      const { error: assignmentError } = await supabase
        .from('player_teams')
        .insert({
          player_id: newPlayer.id,
          team_id: team.id,
          is_active: true,
          assigned_at: new Date().toISOString()
        });

      if (assignmentError) {
        console.error('Error creating team assignment:', assignmentError);
        toast({
          title: "Error",
          description: "Failed to add player to team",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Player added to team successfully",
      });

      // Refresh players list
      await fetchTeamPlayers();
      setIsAddPlayerMode(false);
      
    } catch (error) {
      console.error('Error adding player:', error);
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeamUpdate = async (formData: any) => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update teams.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          age_group: formData.ageGroup,
          season: formData.season,
          coach_id: formData.coachId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', team.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team updated successfully.",
      });
      
      setIsEditMode(false);
      onTeamUpdate();
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveTeam = async () => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team archived successfully.",
      });
      
      onTeamUpdate();
      onClose();
    } catch (error) {
      console.error('Error archiving team:', error);
      toast({
        title: "Error",
        description: "Failed to archive team",
        variant: "destructive",
      });
    }
  };

  const handleRestoreTeam = async () => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team restored successfully.",
      });
      
      onTeamUpdate();
    } catch (error) {
      console.error('Error restoring team:', error);
      toast({
        title: "Error",
        description: "Failed to restore team",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!isSuperAdmin) return;

    try {
      // Check if team has players using the player_teams junction table
      const { data: teamPlayers, error: playersError } = await supabase
        .from('player_teams')
        .select('id')
        .eq('team_id', team.id)
        .eq('is_active', true);

      if (playersError) throw playersError;

      if (teamPlayers && teamPlayers.length > 0) {
        toast({
          title: "Cannot Delete Team",
          description: `This team has ${teamPlayers.length} player(s). Please remove all players before deleting the team.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully.",
      });
      
      onTeamUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    }
  };

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{team.name}</DialogTitle>
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Cancel Edit' : 'Edit Team'}
                </Button>
                
                {team.is_active !== false ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive Team</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to archive "{team.name}"? This will hide the team from active lists but preserve all data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchiveTeam}>
                          Archive Team
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreTeam}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Team</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete "{team.name}"? This action cannot be undone.
                        {players.length > 0 && (
                          <span className="block mt-2 text-destructive font-medium">
                            Warning: This team has {players.length} player(s) assigned.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteTeam}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline">{team.age_group}</Badge>
            <Badge variant="secondary">{team.season}</Badge>
            {team.is_active === false && (
              <Badge variant="destructive">Archived</Badge>
            )}
          </div>
        </DialogHeader>

        {isEditMode ? (
          <div className="mt-6">
            <EnhancedTeamForm
              onSubmit={handleTeamUpdate}
              initialData={{
                name: team.name,
                ageGroup: team.age_group,
                season: team.season,
                coachId: team.coach_id || '',
              }}
              isLoading={isSubmitting}
              onCancel={() => setIsEditMode(false)}
            />
          </div>
        ) : isAddPlayerMode ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Player</h3>
              <Button 
                variant="outline" 
                onClick={() => setIsAddPlayerMode(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
            <PlayerSelectionForm
              onSubmit={handleAddPlayer}
              isLoading={isSubmitting}
            />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Players ({players.length})</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Coach</p>
                      <p className="font-medium">{team.profiles?.full_name || 'No coach assigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(team.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p className="font-medium">{new Date(team.updated_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Players</p>
                      <p className="font-medium text-2xl">{players.filter(p => p.is_active).length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Players</p>
                      <p className="font-medium text-2xl">{players.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Team Roster</h3>
                {isSuperAdmin && (
                  <Button size="sm" onClick={() => setIsAddPlayerMode(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Player
                  </Button>
                )}
              </div>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading players...</p>
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No players assigned to this team yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <Card key={player.id} className={!player.is_active ? 'opacity-60' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={player.profiles?.avatar_url} />
                            <AvatarFallback>
                              {player.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{player.profiles?.full_name || 'Unknown Player'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {player.jersey_number && (
                                <span>#{player.jersey_number}</span>
                              )}
                              {player.position && (
                                <span>{player.position}</span>
                              )}
                            </div>
                            {!player.is_active && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Schedule management coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Team statistics coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamDetailsModal;