import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, Edit, Trash2, Search, RefreshCw, Shield, UserCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import EnhancedTeamForm from '@/components/forms/EnhancedTeamForm';
import TeamDetailsModal from '@/components/team/TeamDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTeamsCache } from '@/hooks/useTeamsCache';
import { ErrorLogger } from '@/utils/errorLogger';
import { ErrorLogger } from '@/utils/errorLogger';

interface Team {
  id: string;
  name: string;
  age_group: string;
  season: string;
  coach_id?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  } | null;
  _count?: {
    players: number;
  };
}

const Teams = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const { currentUser } = useCurrentUser();
  const { teams, loading, error, fetchTeams, invalidateCache } = useTeamsCache();

  // Permission checks based on custom instructions
  const canManageTeams = isSuperAdmin() || hasRole('staff');
  const canViewTeams = isSuperAdmin() || hasRole('staff') || hasRole('coach');

  // Filter and sort teams
  const filteredAndSortedTeams = useMemo(() => {
    let filtered = teams;

    if (searchTerm) {
      filtered = teams.filter(team => 
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.age_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.season.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      // Sort by season (newest first), then by age group, then by name
      const seasonCompare = b.season.localeCompare(a.season);
      if (seasonCompare !== 0) return seasonCompare;
      
      const ageCompare = a.age_group.localeCompare(b.age_group);
      if (ageCompare !== 0) return ageCompare;
      
      return a.name.localeCompare(b.name);
    });
  }, [teams, searchTerm]);

  const handleSubmit = async (formData: any) => {
    if (!canManageTeams) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage teams.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTeam) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update({
            name: formData.name,
            age_group: formData.ageGroup,
            season: formData.season,
            coach_id: formData.coachId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTeam.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team updated successfully.",
        });
      } else {
        // Create new team
        const { error } = await supabase
          .from('teams')
          .insert({
            name: formData.name,
            age_group: formData.ageGroup,
            season: formData.season,
            coach_id: formData.coachId || null,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team created successfully.",
        });
      }

      setIsFormOpen(false);
      setEditingTeam(null);
      invalidateCache();
    } catch (error) {
      console.error('Error saving team:', error);
      
      await ErrorLogger.logError(error, {
        component: 'Teams',
        action: editingTeam ? 'update' : 'create',
        userId: user?.id,
        metadata: { teamData: formData, editingTeamId: editingTeam?.id }
      });

      toast({
        title: "Error",
        description: `Failed to ${editingTeam ? 'update' : 'create'} team: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!canManageTeams) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete teams.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if team has players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', teamId);

      if (playersError) throw playersError;

      if (players && players.length > 0) {
        toast({
          title: "Cannot Delete Team",
          description: `This team has ${players.length} player(s). Please remove all players before deleting the team.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully.",
      });
      
      invalidateCache();
    } catch (error) {
      console.error('Error deleting team:', error);
      
      await ErrorLogger.logError(error, {
        component: 'Teams',
        action: 'delete',
        userId: user?.id,
        metadata: { teamId }
      });

      toast({
        title: "Error",
        description: `Failed to delete team: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setDeleteTeamId(null);
    }
  };

  const openEditForm = (team: Team) => {
    setEditingTeam(team);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingTeam(null);
    setIsFormOpen(true);
  };

  const handleRefresh = () => {
    invalidateCache();
    toast({
      title: "Refreshed",
      description: "Teams data has been refreshed.",
    });
  };

  const openTeamDetails = (team: Team) => {
    setSelectedTeam(team);
    setIsDetailsModalOpen(true);
  };

  const closeTeamDetails = () => {
    setSelectedTeam(null);
    setIsDetailsModalOpen(false);
  };

  if (!canViewTeams) {
    return (
      <Layout currentUser={currentUser}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to view teams. Contact your administrator for access.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="mobile-space-y">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mobile-gap">
          <div className="text-center sm:text-left">
            <h1 className="mobile-title text-foreground">Teams</h1>
            <p className="mobile-text text-muted-foreground">
              Manage your organization's teams
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh teams"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {canManageTeams && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddForm} size="lg" className="w-full sm:w-auto">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="mobile-container max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="mobile-subtitle">
                      {editingTeam ? 'Edit Team' : 'Add New Team'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTeam 
                        ? 'Update the team information below.'
                        : 'Create a new team by filling out the information below.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <EnhancedTeamForm
                    onSubmit={handleSubmit}
                    initialData={editingTeam ? {
                      name: editingTeam.name,
                      ageGroup: editingTeam.age_group,
                      season: editingTeam.season,
                      coachId: editingTeam.coach_id || '',
                    } : undefined}
                    isLoading={isSubmitting}
                    onCancel={() => setIsFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams by name, age group, season, or coach..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search teams"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teams ({filteredAndSortedTeams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">Error loading teams: {error}</p>
                <Button onClick={handleRefresh} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading teams...</p>
              </div>
            ) : filteredAndSortedTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No teams match your search.' : 'No teams found. Create your first team to get started.'}
                </p>
                {canManageTeams && !searchTerm && (
                  <Button onClick={openAddForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Team
                  </Button>
                )}
              </div>
            ) : (
              <div className="mobile-list">
                 {filteredAndSortedTeams.map((team) => (
                   <div 
                     key={team.id} 
                     className="mobile-list-item cursor-pointer hover:bg-muted/50 transition-colors"
                     onClick={() => openTeamDetails(team)}
                   >
                    <div className="mobile-list-header">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <h3 className="mobile-text font-semibold text-foreground">
                            {team.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {team.age_group}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {team.season}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                       <div className="flex items-center gap-1">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={(e) => {
                             e.stopPropagation();
                             openTeamDetails(team);
                           }}
                           className="touch-target"
                           aria-label={`View ${team.name} details`}
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         
                         {canManageTeams && (
                           <>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 openEditForm(team);
                               }}
                               className="touch-target"
                               aria-label={`Edit ${team.name}`}
                             >
                               <Edit className="h-4 w-4" />
                             </Button>
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={(e) => e.stopPropagation()}
                                   className="touch-target"
                                   aria-label={`Delete ${team.name}`}
                                 >
                                   <Trash2 className="h-4 w-4 text-destructive" />
                                 </Button>
                               </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{team.name}"? This action cannot be undone.
                                  {team._count && team._count.players > 0 && (
                                    <span className="block mt-2 text-destructive font-medium">
                                      Warning: This team has {team._count.players} player(s) assigned.
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(team.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                             </AlertDialogContent>
                             </AlertDialog>
                           </>
                         )}
                       </div>
                    </div>
                    
                    <div className="mobile-list-content">
                      {/* Coach */}
                      <div className="flex items-center gap-2 mobile-text-sm">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Coach:</span>
                        <span>
                          {team.profiles?.full_name || 'No coach assigned'}
                        </span>
                      </div>
                      
                      {/* Player count */}
                      <div className="flex items-center gap-2 mobile-text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Players:</span>
                        <Badge variant="outline" className="text-xs">
                          {team._count?.players || 0}
                        </Badge>
                      </div>
                      
                      {/* Created date */}
                      <div className="mobile-text-sm text-muted-foreground">
                        Created: {new Date(team.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          isOpen={isDetailsModalOpen}
          onClose={closeTeamDetails}
          onTeamUpdate={() => {
            invalidateCache();
            closeTeamDetails();
          }}
        />
      )}
    </Layout>
  );
};

export default Teams;