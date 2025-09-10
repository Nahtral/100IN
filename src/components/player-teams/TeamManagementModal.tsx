import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, UserCheck, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface Team {
  id: string;
  name: string;
}

interface PlayerTeam {
  id: string;
  team_id: string;
  role_on_team: string;
  assigned_at: string;
  is_active: boolean;
  team_name?: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  onUpdate?: () => void;
}

export const TeamManagementModal = ({ 
  isOpen, 
  onClose, 
  playerId, 
  playerName,
  onUpdate 
}: TeamManagementModalProps) => {
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('player');
  const [loading, setLoading] = useState(false);
  
  const { isSuperAdmin } = useOptimizedAuth();
  const isReadOnly = !isSuperAdmin();

  useEffect(() => {
    if (isOpen) {
      fetchPlayerTeams();
      fetchAvailableTeams();
    }
  }, [isOpen, playerId]);

  const fetchPlayerTeams = async () => {
    try {
      // First get player team assignments
      const { data: playerTeamsData, error: playerTeamsError } = await supabase
        .from('player_teams')
        .select('id, team_id, role_on_team, assigned_at, is_active')
        .eq('player_id', playerId)
        .eq('is_active', true);

      if (playerTeamsError) throw playerTeamsError;

      // Then get team names for those assignments
      if (playerTeamsData && playerTeamsData.length > 0) {
        const teamIds = playerTeamsData.map(pt => pt.team_id);
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);

        if (teamsError) throw teamsError;

        // Combine the data
        const enrichedPlayerTeams = playerTeamsData.map(pt => ({
          ...pt,
          team_name: teamsData?.find(t => t.id === pt.team_id)?.name || 'Unknown Team'
        }));

        setPlayerTeams(enrichedPlayerTeams);
      } else {
        setPlayerTeams([]);
      }
    } catch (error) {
      console.error('Error fetching player teams:', error);
      toast.error('Failed to load player teams');
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name');

      if (error) throw error;
      setAvailableTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const handleAddTeam = async () => {
    if (!selectedTeam) {
      toast.error('Please select a team');
      return;
    }

    // Check if player is already on this team
    const alreadyOnTeam = playerTeams.some(pt => pt.team_id === selectedTeam);
    if (alreadyOnTeam) {
      toast.error('Player is already assigned to this team');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_teams')
        .insert({
          player_id: playerId,
          team_id: selectedTeam,
          role_on_team: selectedRole
        });

      if (error) throw error;

      toast.success('Player added to team successfully');
      setSelectedTeam('');
      setSelectedRole('player');
      fetchPlayerTeams();
      onUpdate?.();
    } catch (error) {
      console.error('Error adding player to team:', error);
      toast.error('Failed to add player to team');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeam = async (playerTeamId: string, teamName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_teams')
        .update({ is_active: false })
        .eq('id', playerTeamId);

      if (error) throw error;

      toast.success(`Player removed from ${teamName}`);
      fetchPlayerTeams();
      onUpdate?.();
    } catch (error) {
      console.error('Error removing player from team:', error);
      toast.error('Failed to remove player from team');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (playerTeamId: string, newRole: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_teams')
        .update({ role_on_team: newRole })
        .eq('id', playerTeamId);

      if (error) throw error;

      toast.success('Role updated successfully');
      fetchPlayerTeams();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const getUnassignedTeams = () => {
    const assignedTeamIds = playerTeams.map(pt => pt.team_id);
    return availableTeams.filter(team => !assignedTeamIds.includes(team.id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReadOnly ? <Lock className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
            {isReadOnly ? `Team Information for ${playerName}` : `Manage Teams for ${playerName}`}
          </DialogTitle>
        </DialogHeader>

        {isReadOnly && (
          <div className="bg-muted/50 border border-muted rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Read-only view - Only Super Admins can modify team assignments</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Current Teams */}
          <Card>
            <CardHeader>
              <CardTitle>Current Teams ({playerTeams.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {playerTeams.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Player is not assigned to any teams
                  </p>
                ) : (
                  playerTeams.map((playerTeam) => (
                    <div key={playerTeam.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{playerTeam.team_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Role: {playerTeam.role_on_team}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={playerTeam.role_on_team}
                          onValueChange={(newRole) => handleUpdateRole(playerTeam.id, newRole)}
                          disabled={loading || isReadOnly}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="player">Player</SelectItem>
                            <SelectItem value="captain">Captain</SelectItem>
                            <SelectItem value="co-captain">Co-Captain</SelectItem>
                            <SelectItem value="substitute">Substitute</SelectItem>
                          </SelectContent>
                        </Select>
                        {!isReadOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveTeam(playerTeam.id, playerTeam.team_name || 'Team')}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add New Team - Only visible to Super Admins */}
          {!isReadOnly && (
            <Card>
              <CardHeader>
                <CardTitle>Add to Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="team-select">Team</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUnassignedTeams().map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="role-select">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Player</SelectItem>
                        <SelectItem value="captain">Captain</SelectItem>
                        <SelectItem value="co-captain">Co-Captain</SelectItem>
                        <SelectItem value="substitute">Substitute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAddTeam} 
                      disabled={loading || !selectedTeam}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Team
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total teams: {playerTeams.length}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};