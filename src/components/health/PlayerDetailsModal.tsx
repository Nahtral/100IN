import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Activity,
  Calendar,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
}

const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin
}) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = players.filter(player =>
      player.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          profiles!players_user_id_fkey(full_name, email, phone),
          player_teams!inner(
            teams!inner(name)
          ),
          health_wellness(fitness_score, injury_status),
          daily_health_checkins(check_in_date)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to load player data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivatePlayer = async (playerId: string) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player deactivated successfully"
      });
      fetchPlayers();
    } catch (error) {
      console.error('Error deactivating player:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate player",
        variant: "destructive"
      });
    }
  };

  const getHealthStatus = (player: any) => {
    const latestHealth = player.health_wellness?.[0];
    if (!latestHealth) return { status: 'No Data', color: 'gray' };
    
    if (latestHealth.injury_status === 'injured') {
      return { status: 'Injured', color: 'red' };
    } else if (latestHealth.fitness_score >= 80) {
      return { status: 'Excellent', color: 'green' };
    } else if (latestHealth.fitness_score >= 60) {
      return { status: 'Good', color: 'blue' };
    } else {
      return { status: 'Needs Attention', color: 'yellow' };
    }
  };

  const getLastCheckIn = (player: any) => {
    const checkIns = player.daily_health_checkins || [];
    if (checkIns.length === 0) return 'Never';
    
    const latest = checkIns.reduce((latest: any, current: any) => 
      new Date(current.check_in_date) > new Date(latest.check_in_date) ? current : latest
    );
    
    return new Date(latest.check_in_date).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Health Overview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {isSuperAdmin && (
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Player
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredPlayers.length}</div>
                <p className="text-sm text-gray-600">Active Players</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredPlayers.filter(p => getHealthStatus(p).status === 'Excellent').length}
                </div>
                <p className="text-sm text-gray-600">Excellent Health</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredPlayers.filter(p => getHealthStatus(p).status === 'Injured').length}
                </div>
                <p className="text-sm text-gray-600">Currently Injured</p>
              </CardContent>
            </Card>
          </div>

          {/* Player List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">Loading players...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No players found matching your search.
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const healthStatus = getHealthStatus(player);
                const lastCheckIn = getLastCheckIn(player);
                
                return (
                  <Card key={player.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserCheck className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{player.profiles?.full_name || 'Unknown'}</h3>
                            <p className="text-sm text-gray-600">{player.profiles?.email}</p>
                            <p className="text-xs text-gray-500">
                              Team: {player.teams?.name || 'Not assigned'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <Badge 
                              variant="secondary" 
                              className={`bg-${healthStatus.color}-100 text-${healthStatus.color}-800`}
                            >
                              {healthStatus.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">Health Status</p>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {lastCheckIn}
                            </div>
                            <p className="text-xs text-gray-500">Last Check-in</p>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-1 text-sm">
                              <Activity className="h-3 w-3" />
                              {player.health_wellness?.[0]?.fitness_score || 'N/A'}
                            </div>
                            <p className="text-xs text-gray-500">Fitness Score</p>
                          </div>

                          {isSuperAdmin && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={() => handleDeactivatePlayer(player.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailsModal;