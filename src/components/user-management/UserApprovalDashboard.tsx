import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, UserCheck, UserX, Eye, Calendar, Mail, User, Shield, Settings, Users, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserDetailsView from './UserDetailsView';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  requested_role?: string;
}

interface UserRole {
  role: string;
  is_active: boolean;
  approved_at: string | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface PlayerOption {
  id: string;
  full_name: string;
  email: string;
}

export const UserApprovalDashboard = () => {
  const { isSuperAdmin } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [viewDetailsUser, setViewDetailsUser] = useState<PendingUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roleAssignmentReason, setRoleAssignmentReason] = useState('');
  
  // Team assignment state (for players)
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Array<{teamId: string, role: string}>>([]);
  
  // Parent-child connection state (for parents)
  const [availablePlayers, setAvailablePlayers] = useState<PlayerOption[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<Array<{playerId: string, relationshipType: string}>>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingUsers();
      fetchTeams();
      fetchPlayers();
    }
  }, [isSuperAdmin]);

  const fetchPendingUsers = async () => {
    try {
      // Fetch pending users and their requested roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get requested roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role, is_active')
            .eq('user_id', profile.id)
            .eq('is_active', false)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...profile,
            requested_role: roles?.[0]?.role || 'player'
          };
        })
      );

      setPendingUsers(usersWithRoles as PendingUser[]);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: "Error",
        description: "Failed to load pending users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      // Use the RPC function to avoid TypeScript issues
      const { data: teamsData, error } = await supabase.rpc('get_active_teams');

      if (error) {
        console.error('Error fetching teams:', error);
        setAvailableTeams([]);
        return;
      }
      
      // Simple mapping without complex type inference
      const teams: TeamOption[] = [];
      if (teamsData && Array.isArray(teamsData)) {
        teamsData.forEach((team: any) => {
          teams.push({
            id: team.id,
            name: team.name
          });
        });
      }
      
      setAvailableTeams(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setAvailableTeams([]);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, profiles!inner(id, full_name, email)')
        .eq('is_active', true);

      if (error) throw error;
      
      const players: PlayerOption[] = (data as any[] || []).map((player: any) => ({
        id: player.id,
        full_name: player.profiles?.full_name || '',
        email: player.profiles?.email || ''
      }));
      
      setAvailablePlayers(players);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    setActionLoading(userId);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const updateData = {
        approval_status: approved ? 'approved' : 'rejected',
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString(),
        ...(approved ? {} : { rejection_reason: rejectionReason })
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // If approved and role is selected, proceed with role assignment and additional setup
      if (approved && selectedRole) {
        await assignRoleToUser(userId, selectedRole, roleAssignmentReason || 'Role assigned during approval process');
        
        // Handle team assignments for players
        if (selectedRole === 'player' && selectedTeams.length > 0) {
          await assignPlayerToTeams(userId, selectedTeams);
        }
        
        // Handle parent-child relationships for parents
        if (selectedRole === 'parent' && selectedChildren.length > 0) {
          await createParentChildRelationships(userId, selectedChildren);
        }
      }

      toast({
        title: approved ? "User Approved" : "User Rejected",
        description: `User has been ${approved ? 'approved and can now access the platform' : 'rejected'}.`,
      });

      // Send email notification would go here
      if (approved) {
        // TODO: Call edge function to send approval email
        console.log('Would send approval email to user');
      } else {
        // TODO: Call edge function to send rejection email
        console.log('Would send rejection email to user');
      }

      fetchPendingUsers();
      resetForm();
    } catch (error) {
      console.error('Error processing approval:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to process user approval: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setRejectionReason('');
    setSelectedUser(null);
    setSelectedRole('');
    setRoleAssignmentReason('');
    setSelectedTeams([]);
    setSelectedChildren([]);
  };

  const assignRoleToUser = async (userId: string, role: string, reason: string) => {
    try {
      // Validate role enum
      const validRoles = ['super_admin', 'staff', 'coach', 'player', 'parent', 'medical', 'partner'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }

      // Cast role to the expected enum type
      const roleEnum = role as 'player' | 'parent' | 'coach' | 'staff' | 'medical' | 'partner' | 'super_admin';
      
      // First, try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('user_roles')
        .update({ 
          is_active: true, 
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role', roleEnum)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update existing role: ${updateError.message}`);
      }

      // If no records were updated, insert a new one
      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: roleEnum,
            is_active: true,
            approved_by: user?.id,
            approved_at: new Date().toISOString()
            // created_at will use default value
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Failed to insert new role: ${insertError.message}`);
        }
        
        console.log(`Inserted new role ${roleEnum} for user ${userId}`);
      } else {
        console.log(`Updated existing role ${roleEnum} for user ${userId}`);
      }

      // Log the role assignment if audit table is available
      try {
        await supabase
          .from('role_change_audit')
          .insert({
            user_id: userId,
            new_role: role,
            changed_by: user?.id,
            reason: reason
          });
      } catch (auditError) {
        console.error('Failed to log role assignment:', auditError);
        // Don't throw, as this is just logging
      }

    } catch (error) {
      console.error('Error assigning role:', error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Role assignment failed: ${error.message}`);
      } else {
        throw new Error('Role assignment failed with unknown error');
      }
    }
  };

  const assignPlayerToTeams = async (userId: string, teamAssignments: Array<{teamId: string, role: string}>) => {
    try {
      // First, get the player record for this user
      const { data: playerData, error: playerFetchError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (playerFetchError) {
        // If no player record exists, create one first
        const { data: newPlayerData, error: playerCreateError } = await supabase
          .from('players')
          .insert({
            user_id: userId,
            is_active: true
          })
          .select('id')
          .single();

        if (playerCreateError) throw playerCreateError;
        
        const playerId = newPlayerData.id;
        
        // Create team assignments
        const teamInserts = teamAssignments.map(assignment => ({
          player_id: playerId,
          team_id: assignment.teamId,
          role_on_team: assignment.role,
          assigned_by: user?.id
        }));

        const { error: teamAssignError } = await supabase
          .from('player_teams')
          .insert(teamInserts);

        if (teamAssignError) throw teamAssignError;
      } else {
        // Player exists, create team assignments
        const playerId = playerData.id;
        
        const teamInserts = teamAssignments.map(assignment => ({
          player_id: playerId,
          team_id: assignment.teamId,
          role_on_team: assignment.role,
          assigned_by: user?.id
        }));

        const { error: teamAssignError } = await supabase
          .from('player_teams')
          .insert(teamInserts);

        if (teamAssignError) throw teamAssignError;
      }
    } catch (error) {
      console.error('Error assigning player to teams:', error);
      throw error;
    }
  };

  const createParentChildRelationships = async (parentUserId: string, childRelationships: Array<{playerId: string, relationshipType: string}>) => {
    try {
      // Get child user IDs from player IDs
      const playerIds = childRelationships.map(rel => rel.playerId);
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, user_id')
        .in('id', playerIds);

      if (playersError) throw playersError;

      const relationshipInserts = childRelationships.map(rel => {
        const player = playersData?.find((p: any) => p.id === rel.playerId);
        if (!player) return null;
        
        return {
          parent_id: parentUserId,
          child_id: player.user_id,
          relationship_type: rel.relationshipType
        };
      }).filter(Boolean);

      if (relationshipInserts.length > 0) {
        const { error: relationshipError } = await supabase
          .from('parent_child_relationships')
          .insert(relationshipInserts);

        if (relationshipError) throw relationshipError;
      }
    } catch (error) {
      console.error('Error creating parent-child relationships:', error);
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  };

  const availableRoles = ['player', 'parent', 'coach', 'staff', 'medical', 'partner'] as const;

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Access denied. Super Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            User Approval Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading pending users...</div>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">All registered users have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <Card 
                  key={user.id} 
                  className="border-l-4 border-l-yellow-400 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setViewDetailsUser(user)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{user.full_name}</span>
                          </div>
                          {getStatusBadge(user.approval_status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Registered {formatDistanceToNow(new Date(user.created_at))} ago</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Phone:</span>
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {user.requested_role && (
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Requested Role:</span>
                              <Badge variant="outline" className="text-xs">
                                {getRoleDisplayName(user.requested_role)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              disabled={actionLoading === user.id}
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(user.requested_role || 'player');
                                setRoleAssignmentReason(`Approved as ${getRoleDisplayName(user.requested_role || 'player')}`);
                                setSelectedTeams([]);
                                setSelectedChildren([]);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve & Assign Role
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Approve User & Assign Role
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Approve <strong>{user.full_name}</strong> ({user.email}) and assign their role.
                                <br />
                                This will grant them access to the platform with the specified role permissions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="role-select">Assign Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        <div className="flex items-center gap-2">
                                          <Shield className="h-4 w-4" />
                                          {getRoleDisplayName(role)}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {user.requested_role && (
                                  <p className="text-xs text-muted-foreground">
                                    User requested: {getRoleDisplayName(user.requested_role)}
                                  </p>
                                )}
                              </div>

                              {/* Team Assignment Section - Only for Players */}
                              {selectedRole === 'player' && (
                                <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-600" />
                                    <Label className="text-sm font-medium text-blue-800">Team Assignment</Label>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Assign this player to teams (optional)
                                  </p>
                                  
                                  {availableTeams.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <Select 
                                          value="" 
                                          onValueChange={(teamId) => {
                                            if (teamId && !selectedTeams.some(t => t.teamId === teamId)) {
                                              setSelectedTeams([...selectedTeams, { teamId, role: 'player' }]);
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a team to add" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableTeams
                                              .filter(team => !selectedTeams.some(st => st.teamId === team.id))
                                              .map((team) => (
                                                <SelectItem key={team.id} value={team.id}>
                                                  {team.name}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {selectedTeams.length > 0 && (
                                        <div className="space-y-2">
                                          {selectedTeams.map((assignment, index) => {
                                            const team = availableTeams.find(t => t.id === assignment.teamId);
                                            return (
                                              <div key={assignment.teamId} className="flex items-center gap-2 p-2 bg-white border rounded">
                                                <span className="flex-1 text-sm">{team?.name}</span>
                                                <Select 
                                                  value={assignment.role} 
                                                  onValueChange={(role) => {
                                                    const updated = [...selectedTeams];
                                                    updated[index].role = role;
                                                    setSelectedTeams(updated);
                                                  }}
                                                >
                                                  <SelectTrigger className="w-32">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="player">Player</SelectItem>
                                                    <SelectItem value="captain">Captain</SelectItem>
                                                    <SelectItem value="co_captain">Co-Captain</SelectItem>
                                                    <SelectItem value="substitute">Substitute</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => setSelectedTeams(selectedTeams.filter(t => t.teamId !== assignment.teamId))}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No teams available</p>
                                  )}
                                </div>
                              )}

                              {/* Parent-Child Connection Section - Only for Parents */}
                              {selectedRole === 'parent' && (
                                <div className="space-y-3 p-4 border rounded-lg bg-green-50/50">
                                  <div className="flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-green-600" />
                                    <Label className="text-sm font-medium text-green-800">Parent-Child Connection</Label>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Connect this parent to their children (optional)
                                  </p>
                                  
                                  {availablePlayers.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <Select 
                                          value="" 
                                          onValueChange={(playerId) => {
                                            if (playerId && !selectedChildren.some(c => c.playerId === playerId)) {
                                              setSelectedChildren([...selectedChildren, { playerId, relationshipType: 'parent' }]);
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a player to connect" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availablePlayers
                                              .filter(player => !selectedChildren.some(sc => sc.playerId === player.id))
                                              .map((player) => (
                                                <SelectItem key={player.id} value={player.id}>
                                                  <div className="flex flex-col">
                                                    <span className="font-medium">{player.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{player.email}</span>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {selectedChildren.length > 0 && (
                                        <div className="space-y-2">
                                          {selectedChildren.map((connection, index) => {
                                            const player = availablePlayers.find(p => p.id === connection.playerId);
                                            return (
                                              <div key={connection.playerId} className="flex items-center gap-2 p-2 bg-white border rounded">
                                                <div className="flex-1">
                                                  <div className="text-sm font-medium">{player?.full_name}</div>
                                                  <div className="text-xs text-muted-foreground">{player?.email}</div>
                                                </div>
                                                <Select 
                                                  value={connection.relationshipType} 
                                                  onValueChange={(type) => {
                                                    const updated = [...selectedChildren];
                                                    updated[index].relationshipType = type;
                                                    setSelectedChildren(updated);
                                                  }}
                                                >
                                                  <SelectTrigger className="w-24">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="parent">Parent</SelectItem>
                                                    <SelectItem value="guardian">Guardian</SelectItem>
                                                    <SelectItem value="relative">Relative</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => setSelectedChildren(selectedChildren.filter(c => c.playerId !== connection.playerId))}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No players available</p>
                                  )}
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label htmlFor="role-reason">Role Assignment Reason</Label>
                                <Textarea
                                  id="role-reason"
                                  placeholder="Explain why this role is being assigned..."
                                  value={roleAssignmentReason}
                                  onChange={(e) => setRoleAssignmentReason(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>

                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={resetForm}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproval(user.id, true)}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!selectedRole || !roleAssignmentReason.trim()}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Approve & Assign Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              disabled={actionLoading === user.id}
                              onClick={() => setSelectedUser(user)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject User Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reject <strong>{user.full_name}</strong> ({user.email})?
                                <br />
                                <br />
                                Please provide a reason for rejection:
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Textarea
                                placeholder="Enter rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setRejectionReason('');
                                setSelectedUser(null);
                              }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApproval(user.id, false)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={!rejectionReason.trim()}
                              >
                                Reject User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!viewDetailsUser} onOpenChange={(open) => !open && setViewDetailsUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details - {viewDetailsUser?.full_name}</DialogTitle>
          </DialogHeader>
          {viewDetailsUser && (
            <UserDetailsView 
              user={{
                id: viewDetailsUser.id,
                email: viewDetailsUser.email,
                full_name: viewDetailsUser.full_name,
                created_at: viewDetailsUser.created_at,
                approval_status: viewDetailsUser.approval_status || 'pending'
              }}
              onClose={() => setViewDetailsUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};