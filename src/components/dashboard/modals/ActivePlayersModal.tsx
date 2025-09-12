import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Users, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone,
  Calendar,
  MapPin,
  Activity,
  Heart,
  Target,
  Download,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPlayers: number;
}

interface PlayerData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  jersey_number: number;
  team_name: string;
  is_active: boolean;
  last_activity: string;
  fitness_score: number;
  attendance_rate: number;
  performance_rating: number;
}

export const ActivePlayersModal: React.FC<ActivePlayersModalProps> = ({
  isOpen,
  onClose,
  totalPlayers
}) => {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          position,
          jersey_number,
          is_active,
          created_at,
          profiles!inner(
            full_name,
            email,
            phone
          ),
          teams!left(
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data and add mock metrics
      const transformedData: PlayerData[] = (data || []).map(player => ({
        id: player.id,
        user_id: player.user_id,
        full_name: player.profiles?.full_name || 'Unknown',
        email: player.profiles?.email || '',
        phone: player.profiles?.phone || '',
        position: player.position || 'Position TBD',
        jersey_number: player.jersey_number || 0,
        team_name: (player.teams as any)?.name || 'No Team',
        is_active: player.is_active,
        last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        fitness_score: Math.floor(Math.random() * 40) + 60,
        attendance_rate: Math.floor(Math.random() * 30) + 70,
        performance_rating: Math.floor(Math.random() * 40) + 60
      }));

      setPlayers(transformedData);
      setFilteredPlayers(transformedData);
      
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = players;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(player => 
        statusFilter === 'active' ? player.is_active : !player.is_active
      );
    }

    // Apply team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(player => player.team_name === teamFilter);
    }

    setFilteredPlayers(filtered);
  }, [players, searchTerm, statusFilter, teamFilter]);

  const handleBulkAction = async (action: string) => {
    if (selectedPlayers.length === 0) {
      toast.error('Please select players first');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          await bulkUpdateStatus(true);
          break;
        case 'deactivate':
          await bulkUpdateStatus(false);
          break;
        case 'notify':
          toast.success(`Notifications sent to ${selectedPlayers.length} players`);
          break;
        case 'export':
          exportSelected();
          break;
      }
      setSelectedPlayers([]);
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  const bulkUpdateStatus = async (status: boolean) => {
    const { error } = await supabase
      .from('players')
      .update({ is_active: status })
      .in('id', selectedPlayers);

    if (error) throw error;
    toast.success(`${selectedPlayers.length} players ${status ? 'activated' : 'deactivated'}`);
    fetchPlayers();
  };

  const exportSelected = () => {
    const selectedData = players.filter(p => selectedPlayers.includes(p.id));
    const csv = [
      'Name,Email,Phone,Position,Team,Status,Fitness,Attendance',
      ...selectedData.map(p => 
        `${p.full_name},${p.email},${p.phone},${p.position},${p.team_name},${p.is_active ? 'Active' : 'Inactive'},${p.fitness_score}%,${p.attendance_rate}%`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-players.csv';
    a.click();
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );

  const getPerformanceBadge = (rating: number) => {
    if (rating >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rating >= 70) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const uniqueTeams = [...new Set(players.map(p => p.team_name))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Players Management ({totalPlayers} Total)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Player Details</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {uniqueTeams.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {selectedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-accent/50 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedPlayers.length} selected:
                  </span>
                  <Button size="sm" onClick={() => handleBulkAction('activate')}>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Activate
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('deactivate')}>
                    <UserX className="h-3 w-3 mr-1" />
                    Deactivate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('notify')}>
                    <Mail className="h-3 w-3 mr-1" />
                    Notify
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              )}

              {/* Players List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8">Loading players...</div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No players found matching your criteria
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <Card key={player.id} className="hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPlayers([...selectedPlayers, player.id]);
                              } else {
                                setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                              }
                            }}
                          />
                          
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                              <div className="font-medium">{player.full_name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {player.email}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm">#{player.jersey_number} - {player.position}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {player.team_name}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(player.is_active)}
                              {getPerformanceBadge(player.performance_rating)}
                            </div>
                            
                            <div className="flex items-center justify-end gap-2">
                              <div className="text-right text-sm">
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3 text-red-500" />
                                  {player.fitness_score}%
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-blue-500" />
                                  {player.attendance_rate}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Player details view - Coming soon
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1">
            <div className="text-center py-8 text-muted-foreground">
              Player analytics view - Coming soon
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};