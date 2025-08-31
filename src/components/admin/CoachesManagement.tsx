import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCog, Trophy, Users, Plus, Eye, Edit, Clock } from 'lucide-react';

interface Coach {
  coach_id: string;
  coach_name: string;
  coach_email: string;
  team_assignments: any[];
  player_assignments: any[];
  total_assignments: number;
}

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  user_id: string;
  full_name: string;
}

export const CoachesManagement = () => {
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    type: 'team',
    targetId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCoaches(),
        fetchTeams(),
        fetchPlayers()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoaches = async () => {
    try {
      // Get coaches directly from profiles and user_roles tables
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (error) throw error;

      // Filter coaches by checking user_roles
      const coachProfiles = [];
      for (const profile of profiles || []) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('role', 'coach')
          .eq('is_active', true);
        
        if (roles && roles.length > 0) {
          coachProfiles.push(profile);
        }
      }

      const coachesData = coachProfiles.map(profile => ({
        coach_id: profile.id,
        coach_name: profile.full_name || 'Unknown Coach',
        coach_email: profile.email,
        team_assignments: [],
        player_assignments: [],
        total_assignments: 0
      }));

      setCoaches(coachesData);
    } catch (error) {
      console.error('Error fetching coaches:', error);
      toast({
        title: "Error",
        description: "Failed to load coaches data",
        variant: "destructive",
      });
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name');

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        user_id
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching players:', error);
      return;
    }

    // Get player names
    const playersWithNames = await Promise.all(
      (data || []).map(async (player) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', player.user_id)
          .single();
        
        return {
          id: player.id,
          user_id: player.user_id,
          full_name: profile?.full_name || 'Unknown Player'
        };
      })
    );

    setPlayers(playersWithNames);
  };

  const createAssignment = async () => {
    if (!selectedCoach || !newAssignment.targetId) {
      toast({
        title: "Error",
        description: "Please select a coach and assignment target",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const assignment = {
        coach_id: selectedCoach.coach_id,
        assignment_type: newAssignment.type,
        assigned_by: user?.id,
        status: 'active',
        ...(newAssignment.type === 'team' 
          ? { team_id: newAssignment.targetId, player_id: null }
          : { player_id: newAssignment.targetId, team_id: null }
        )
      };

      const { error } = await supabase
        .from('coach_assignments')
        .insert([assignment]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Coach assigned to ${newAssignment.type} successfully`,
      });

      setAssignmentDialogOpen(false);
      setSelectedCoach(null);
      setNewAssignment({ type: 'team', targetId: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    }
  };

  const openAssignmentDialog = (coach: Coach) => {
    setSelectedCoach(coach);
    setAssignmentDialogOpen(true);
  };

  const filteredCoaches = coaches.filter(coach => 
    coach.coach_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.coach_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <UserCog className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading coaches management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mobile-subtitle">Coach Management</h2>
          <p className="text-muted-foreground mobile-text-sm">
            Manage coaching staff and their team/player assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {coaches.length} Coaches
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {coaches.reduce((sum, coach) => sum + coach.total_assignments, 0)} Assignments
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Coaching Staff Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search coaches by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md mb-4"
          />

          <div className="space-y-4">
            {filteredCoaches.map((coach) => (
              <div key={coach.coach_id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{coach.coach_name}</p>
                      <p className="text-sm text-muted-foreground">{coach.coach_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {coach.total_assignments} Assignments
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignmentDialog(coach)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>

                {coach.total_assignments === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No current assignments</p>
                  </div>
                )}
              </div>
            ))}

            {filteredCoaches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <UserCog className="h-12 w-12 mb-4 opacity-50" />
                <p>No coaches found matching your search</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Coach: {selectedCoach?.coach_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Assignment Type</label>
              <Select
                value={newAssignment.type}
                onValueChange={(value) => setNewAssignment({ ...newAssignment, type: value, targetId: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team Assignment</SelectItem>
                  <SelectItem value="player">Individual Player</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {newAssignment.type === 'team' ? 'Select Team' : 'Select Player'}
              </label>
              <Select
                value={newAssignment.targetId}
                onValueChange={(value) => setNewAssignment({ ...newAssignment, targetId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${newAssignment.type}...`} />
                </SelectTrigger>
                <SelectContent>
                  {newAssignment.type === 'team' ? (
                    teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))
                  ) : (
                    players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={createAssignment} className="flex-1">
                Create Assignment
              </Button>
              <Button
                variant="outline"
                onClick={() => setAssignmentDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};