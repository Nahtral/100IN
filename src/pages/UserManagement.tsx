import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Shield,
  Activity,
  Heart,
  UserCheck,
  Settings,
  Link,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  roles?: string[];
  last_sign_in?: string;
  status: 'active' | 'inactive';
}

interface TeamData {
  id: string;
  name: string;
  age_group: string;
  season: string;
  coach_id?: string;
  coach_name?: string;
  created_at: string;
}

interface PlayerTeamData {
  id: string;
  full_name: string;
  email: string;
  team_id?: string;
  team_name?: string;
  position?: string;
  jersey_number?: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [players, setPlayers] = useState<PlayerTeamData[]>([]);
  const [coaches, setCoaches] = useState<UserData[]>([]);
  const [parents, setParents] = useState<UserData[]>([]);
  const [selectedTab, setSelectedTab] = useState('users');
  const [showTeamEditDialog, setShowTeamEditDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || "User",
    role: "Super Admin",
    avatar: user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') || "U"
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingApprovals();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles (only active ones for main user list)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles = profiles?.map(profile => {
        const roles = userRoles?.filter(role => role.user_id === profile.id).map(role => role.role) || [];
        return {
          ...profile,
          roles,
          status: 'active' as const,
          last_sign_in: profile.updated_at
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      // Fetch pending user roles with profiles
      const { data: pendingRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at
        `)
        .eq('is_active', false)
        .is('approved_at', null);

      if (rolesError) throw rolesError;

      if (!pendingRoles || pendingRoles.length === 0) {
        setPendingApprovals([]);
        return;
      }

      // Fetch profiles for pending users
      const userIds = pendingRoles.map(role => role.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const pendingUsers = pendingRoles.map(roleData => {
        const profile = profiles?.find(p => p.id === roleData.user_id);
        return {
          id: roleData.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
          phone: profile?.phone || '',
          created_at: roleData.created_at,
          roles: [roleData.role],
          status: 'inactive' as const,
          last_sign_in: null
        };
      });

      setPendingApprovals(pendingUsers);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roles?.includes(roleFilter));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-4 w-4 text-red-500" />;
      case 'staff': return <Users className="h-4 w-4 text-blue-500" />;
      case 'coach': return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'player': return <Activity className="h-4 w-4 text-orange-500" />;
      case 'parent': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'medical': return <Heart className="h-4 w-4 text-emerald-500" />;
      default: return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'coach': return 'bg-green-100 text-green-800';
      case 'player': return 'bg-orange-100 text-orange-800';
      case 'parent': return 'bg-pink-100 text-pink-800';
      case 'medical': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // In a real implementation, you'd want to handle this more carefully
      // and possibly soft-delete rather than hard delete
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully.",
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  const handleSaveUser = async (formData: FormData) => {
    try {
      const fullName = formData.get('fullName') as string;
      const email = formData.get('email') as string;
      const phone = formData.get('phone') as string;
      const role = formData.get('role') as string;

      if (selectedUser) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            email: email,
            phone: phone,
          })
          .eq('id', selectedUser.id);

        if (profileError) throw profileError;

        // Update role if changed
        if (role && role !== selectedUser.roles?.[0]) {
          // Deactivate old role
          await supabase
            .from('user_roles')
            .update({ is_active: false })
            .eq('user_id', selectedUser.id);

          // Add new role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: selectedUser.id,
              role: role as any,
              is_active: true,
              approved_by: user?.id,
              approved_at: new Date().toISOString()
            });

          if (roleError) throw roleError;
        }
      } else {
        // Create new user - this would typically be done via invitation
        toast({
          title: "Note",
          description: "User creation requires proper invitation flow with Supabase Auth.",
          variant: "default",
        });
        return;
      }

      toast({
        title: "Success",
        description: `User ${selectedUser ? 'updated' : 'created'} successfully.`,
      });

      setShowUserDialog(false);
      fetchUsers();
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "Failed to save user.",
        variant: "destructive",
      });
    }
  };

  const handleApproveUser = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          is_active: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User approved successfully.",
      });

      fetchUsers();
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Error",
        description: "Failed to approve user.",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any)
        .eq('is_active', false);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User application rejected.",
      });

      fetchPendingApprovals();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Error",
        description: "Failed to reject user.",
        variant: "destructive",
      });
    }
  };

  const fetchTeams = async () => {
    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch coach names separately
      const coachIds = teamsData?.map(team => team.coach_id).filter(Boolean) || [];
      let coachNames: { [key: string]: string } = {};
      
      if (coachIds.length > 0) {
        const { data: coaches } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', coachIds);
        
        coachNames = coaches?.reduce((acc, coach) => {
          acc[coach.id] = coach.full_name;
          return acc;
        }, {} as { [key: string]: string }) || {};
      }

      const teamsWithCoachNames = teamsData?.map(team => ({
        ...team,
        coach_name: team.coach_id ? coachNames[team.coach_id] || 'Unknown coach' : 'No coach assigned'
      })) || [];

      setTeams(teamsWithCoachNames);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles and team names separately
      const userIds = playersData?.map(player => player.user_id) || [];
      const teamIds = playersData?.map(player => player.team_id).filter(Boolean) || [];

      const [userProfiles, teamData] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
        teamIds.length > 0 ? supabase.from('teams').select('id, name').in('id', teamIds) : { data: [] }
      ]);

      const userProfilesMap = userProfiles.data?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as { [key: string]: any }) || {};

      const teamNamesMap = (teamData.data as any[])?.reduce((acc: { [key: string]: string }, team: any) => {
        acc[team.id] = team.name;
        return acc;
      }, {}) || {};

      const playersWithDetails = playersData?.map(player => ({
        id: player.id,
        full_name: userProfilesMap[player.user_id]?.full_name || '',
        email: userProfilesMap[player.user_id]?.email || '',
        team_id: player.team_id,
        team_name: player.team_id ? teamNamesMap[player.team_id] || 'Unknown team' : 'No team assigned',
        position: player.position,
        jersey_number: player.jersey_number
      })) || [];

      setPlayers(playersWithDetails);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchCoachesAndParents = async () => {
    try {
      const { data: coachRoles, error: coachError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coach')
        .eq('is_active', true);

      const { data: parentRoles, error: parentError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'parent')
        .eq('is_active', true);

      if (coachError || parentError) throw coachError || parentError;

      // Fetch profiles for coaches and parents
      const coachUserIds = coachRoles?.map(role => role.user_id) || [];
      const parentUserIds = parentRoles?.map(role => role.user_id) || [];

      const [coachProfiles, parentProfiles] = await Promise.all([
        coachUserIds.length > 0 ? supabase.from('profiles').select('*').in('id', coachUserIds) : { data: [] },
        parentUserIds.length > 0 ? supabase.from('profiles').select('*').in('id', parentUserIds) : { data: [] }
      ]);

      const coachUsers = coachProfiles.data?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        roles: ['coach'],
        status: 'active' as const,
        last_sign_in: profile.updated_at
      })) || [];

      const parentUsers = parentProfiles.data?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        roles: ['parent'],
        status: 'active' as const,
        last_sign_in: profile.updated_at
      })) || [];

      setCoaches(coachUsers);
      setParents(parentUsers);
    } catch (error) {
      console.error('Error fetching coaches and parents:', error);
    }
  };

  useEffect(() => {
    if (selectedTab === 'teams') {
      fetchTeams();
    } else if (selectedTab === 'assignments') {
      fetchPlayers();
      fetchCoachesAndParents();
    }
  }, [selectedTab]);

  const handleUpdateTeam = async (formData: FormData) => {
    if (!selectedTeam) return;

    try {
      const coachId = formData.get('coach_id') as string;
      
      const { error } = await supabase
        .from('teams')
        .update({ 
          coach_id: (coachId === 'none') ? null : coachId 
        })
        .eq('id', selectedTeam.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Team updated successfully.",
      });
      
      setShowTeamEditDialog(false);
      fetchTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: "Error", 
        description: "Failed to update team.",
        variant: "destructive",
      });
    }
  };

  const TeamEditDialog = () => (
    <Dialog open={showTeamEditDialog} onOpenChange={setShowTeamEditDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team - {selectedTeam?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleUpdateTeam(formData);
        }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coach_id">Assign Coach</Label>
            <Select name="coach_id" defaultValue={selectedTeam?.coach_id || 'none'}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No coach assigned</SelectItem>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.full_name} ({coach.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowTeamEditDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const TeamsManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Management</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              try {
                const { error } = await supabase
                  .from('teams')
                  .insert({
                    name: formData.get('name') as string,
                    age_group: formData.get('age_group') as string,
                    season: formData.get('season') as string,
                    coach_id: formData.get('coach_id') as string || null
                  });

                if (error) throw error;

                toast({
                  title: "Success",
                  description: "Team created successfully.",
                });

                fetchTeams();
              } catch (error) {
                console.error('Error creating team:', error);
                toast({
                  title: "Error",
                  description: "Failed to create team.",
                  variant: "destructive",
                });
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input id="name" name="name" required placeholder="Enter team name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age_group">Age Group</Label>
                <Input id="age_group" name="age_group" required placeholder="e.g., U-16, U-18" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Input id="season" name="season" required placeholder="e.g., 2024, Spring 2024" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach_id">Assign Coach</Label>
                <Select name="coach_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coach (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button type="submit">Create Team</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.age_group}</TableCell>
                  <TableCell>{team.season}</TableCell>
                  <TableCell>{team.coach_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowTeamEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
                            try {
                              const { error } = await supabase
                                .from('teams')
                                .delete()
                                .eq('id', team.id);
                              
                              if (error) throw error;
                              
                              toast({
                                title: "Success",
                                description: "Team deleted successfully.",
                              });
                              
                              fetchTeams();
                            } catch (error) {
                              console.error('Error deleting team:', error);
                              toast({
                                title: "Error",
                                description: "Failed to delete team.", 
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const AssignmentsManagement = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Player & Team Assignments</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Team Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Team Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{player.full_name}</p>
                    <p className="text-sm text-gray-500">{player.team_name}</p>
                    {player.position && (
                      <Badge variant="outline" className="text-xs">
                        {player.position} #{player.jersey_number}
                      </Badge>
                    )}
                  </div>
                  <Select
                    defaultValue={player.team_id || ''}
                    onValueChange={async (teamId) => {
                      try {
                        const { error } = await supabase
                          .from('players')
                          .update({ team_id: teamId || null })
                          .eq('id', player.id);

                        if (error) throw error;

                        toast({
                          title: "Success",
                          description: "Player team assignment updated.",
                        });

                        fetchPlayers();
                      } catch (error) {
                        console.error('Error updating player team:', error);
                        toast({
                          title: "Error",
                          description: "Failed to update team assignment.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Assign team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Parent-Child Relationships */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Parent-Child Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Link Parent to Child
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Parent-Child Relationship</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    
                    try {
                      const { error } = await supabase
                        .from('parent_child_relationships')
                        .insert({
                          parent_id: formData.get('parent_id') as string,
                          child_id: formData.get('child_id') as string,
                          relationship_type: formData.get('relationship_type') as string
                        });

                      if (error) throw error;

                      toast({
                        title: "Success",
                        description: "Parent-child relationship created.",
                      });
                    } catch (error) {
                      console.error('Error creating relationship:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create relationship.",
                        variant: "destructive",
                      });
                    }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_id">Parent</Label>
                      <Select name="parent_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                          {parents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="child_id">Child (Player)</Label>
                      <Select name="child_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select child" />
                        </SelectTrigger>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship_type">Relationship</Label>
                      <Select name="relationship_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogTrigger>
                      <Button type="submit">Create Relationship</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const UserDialog = () => (
    <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {selectedUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSaveUser(formData);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={selectedUser?.full_name || ''}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={selectedUser?.email || ''}
                placeholder="Enter email"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={selectedUser?.phone || ''}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue={selectedUser?.roles?.[0] || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <Layout currentUser={currentUser}>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading users...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage users, teams, and assignments</p>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button 
                  onClick={() => {
                    setSelectedUser(null);
                    setShowUserDialog(true);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Pending User Approvals ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.map((pendingUser) => (
                  <div key={pendingUser.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {pendingUser.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{pendingUser.full_name}</p>
                        <p className="text-sm text-gray-500">{pendingUser.email}</p>
                        <Badge variant="outline" className="text-xs">
                          {pendingUser.roles?.[0]?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveUser(pendingUser.id, pendingUser.roles?.[0] || '')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectUser(pendingUser.id, pendingUser.roles?.[0] || '')}
                        className="text-red-600 hover:text-red-700"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.roles?.includes('super_admin')).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Players</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.roles?.includes('player')).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="roleFilter">Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="statusFilter">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((role, index) => (
                          <Badge key={index} variant="outline" className={getRoleBadgeColor(role)}>
                            <span className="flex items-center gap-1">
                              {getRoleIcon(role)}
                              {role.replace('_', ' ')}
                            </span>
                          </Badge>
                        )) || <Badge variant="outline">No Role</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(user.last_sign_in || user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <TeamsManagement />
          </TabsContent>

          <TabsContent value="assignments">
            <AssignmentsManagement />
          </TabsContent>
        </Tabs>

        <UserDialog />
        <TeamEditDialog />
      </div>
    </Layout>
  );
};

export default UserManagement;