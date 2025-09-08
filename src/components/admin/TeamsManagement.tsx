import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Trophy, Calendar } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  age_group: string;
  season: string;
  coach_id?: string;
  coach_name?: string;
  player_count?: number;
  created_at: string;
}

interface Coach {
  id: string;
  full_name: string;
  email: string;
}

export const TeamsManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age_group: '',
    season: '2025-2026',
    coach_id: ''
  });

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Fetch coach information for teams that have coaches
      const coachIds = teamsData?.filter(team => team.coach_id).map(team => team.coach_id) || [];
      let coachData: any[] = [];
      
      if (coachIds.length > 0) {
        const { data: coaches, error: coachError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', coachIds);
        
        if (coachError) throw coachError;
        coachData = coaches || [];
      }

      // Get player counts for each team
      const { data: playerCounts, error: playerError } = await supabase
        .from('players')
        .select('team_id')
        .eq('is_active', true);

      if (playerError) throw playerError;

      const playerCountMap = playerCounts?.reduce((acc, player) => {
        acc[player.team_id] = (acc[player.team_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const formattedTeams = teamsData?.map(team => {
        const coach = coachData.find(c => c.id === team.coach_id);
        return {
          ...team,
          coach_name: coach?.full_name || 'Unassigned',
          player_count: playerCountMap[team.id] || 0
        };
      }) || [];

      setTeams(formattedTeams);

      // Fetch coaches
      const { data: coachesData, error: coachesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', (await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'coach')
          .eq('is_active', true)
        ).data?.map(ur => ur.user_id) || []);

      if (coachesError) throw coachesError;
      setCoaches(coachesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load teams data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.age_group) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .insert([{
          name: formData.name.trim(),
          age_group: formData.age_group,
          season: formData.season,
          coach_id: formData.coach_id || null
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team created successfully"
      });

      setIsCreateModalOpen(false);
      setFormData({ name: '', age_group: '', season: '2025-2026', coach_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive"
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedTeam || !formData.name.trim() || !formData.age_group) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name.trim(),
          age_group: formData.age_group,
          season: formData.season,
          coach_id: formData.coach_id || null
        })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team updated successfully"
      });

      setIsEditModalOpen(false);
      setSelectedTeam(null);
      setFormData({ name: '', age_group: '', season: '2025-2026', coach_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully"
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      age_group: team.age_group,
      season: team.season,
      coach_id: team.coach_id || ''
    });
    setIsEditModalOpen(true);
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.age_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.coach_name && team.coach_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Teams Management</h2>
          <p className="text-muted-foreground">Manage teams, assign coaches, and track players</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            <Trophy className="h-3 w-3 mr-1" />
            {teams.length} Teams
          </Badge>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <Label htmlFor="age_group">Age Group *</Label>
                  <Select value={formData.age_group} onValueChange={(value) => setFormData({ ...formData, age_group: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="U10">U10</SelectItem>
                      <SelectItem value="U12">U12</SelectItem>
                      <SelectItem value="U14">U14</SelectItem>
                      <SelectItem value="U16">U16</SelectItem>
                      <SelectItem value="U18">U18</SelectItem>
                      <SelectItem value="Adult">Adult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="season">Season</Label>
                  <Input
                    id="season"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    placeholder="2025-2026"
                  />
                </div>
                <div>
                  <Label htmlFor="coach">Assign Coach</Label>
                  <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a coach (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No coach assigned</SelectItem>
                      {coaches.map(coach => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.full_name} ({coach.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create Team</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="w-full max-w-sm">
        <Input
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription>{team.age_group} • {team.season}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(team)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(team.id, team.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Coach:</span>
                  <span className="text-sm font-medium">{team.coach_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Players:</span>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {team.player_count}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">{new Date(team.created_at).getMonth() + 1}/{new Date(team.created_at).getDate()}/{new Date(team.created_at).getFullYear()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No teams found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search criteria' : 'Create your first team to get started'}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Team Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <Label htmlFor="edit-age_group">Age Group *</Label>
              <Select value={formData.age_group} onValueChange={(value) => setFormData({ ...formData, age_group: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select age group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="U10">U10</SelectItem>
                  <SelectItem value="U12">U12</SelectItem>
                  <SelectItem value="U14">U14</SelectItem>
                  <SelectItem value="U16">U16</SelectItem>
                  <SelectItem value="U18">U18</SelectItem>
                  <SelectItem value="Adult">Adult</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-season">Season</Label>
              <Input
                id="edit-season"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="2025-2026"
              />
            </div>
            <div>
              <Label htmlFor="edit-coach">Assign Coach</Label>
              <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coach (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No coach assigned</SelectItem>
                  {coaches.map(coach => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.full_name} ({coach.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit}>Update Team</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};