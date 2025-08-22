import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Activity, 
  TrendingUp, 
  Heart, 
  Edit, 
  Archive,
  Trash2,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

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
    email?: string;
    phone?: string;
  } | null;
}

interface PlayerDetailsModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (player: Player) => void;
  onDelete: (playerId: string) => void;
  onArchive?: (playerId: string) => void;
}

const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  player,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onArchive
}) => {
  const [performance, setPerformance] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    if (player && open) {
      fetchPlayerDetails();
    }
  }, [player, open]);

  const fetchPlayerDetails = async () => {
    if (!player) return;
    
    setLoading(true);
    try {
      // Fetch performance data
      const { data: performanceData } = await supabase
        .from('player_performance')
        .select('*')
        .eq('player_id', player.id)
        .order('game_date', { ascending: false })
        .limit(10);

      // Fetch health data
      const { data: healthCheckIns } = await supabase
        .from('daily_health_checkins')
        .select('*')
        .eq('player_id', player.id)
        .order('check_in_date', { ascending: false })
        .limit(10);

      setPerformance(performanceData || []);
      setHealthData(healthCheckIns || []);
    } catch (error) {
      console.error('Error fetching player details:', error);
      toast({
        title: "Error",
        description: "Failed to load player details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = () => {
    if (player && onArchive) {
      onArchive(player.id);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (player && confirm('Are you sure you want to permanently delete this player?')) {
      onDelete(player.id);
      onOpenChange(false);
    }
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {player.profiles?.full_name || 'Player Details'}
            </DialogTitle>
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(player)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {onArchive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="shotiq">ShotIQ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {player.jersey_number && (
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        #{player.jersey_number}
                      </Badge>
                    )}
                    {player.position && (
                      <Badge variant="secondary">
                        {player.position}
                      </Badge>
                    )}
                  </div>
                  
                  {player.height && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Height:</span>
                      <span>{player.height}</span>
                    </div>
                  )}
                  
                  {player.weight && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Weight:</span>
                      <span>{player.weight}</span>
                    </div>
                  )}
                  
                  {player.date_of_birth && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Born: {new Date(player.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              {(player.emergency_contact_name || player.emergency_contact_phone) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {player.emergency_contact_name && (
                      <div>
                        <span className="font-medium">Name:</span> {player.emergency_contact_name}
                      </div>
                    )}
                    {player.emergency_contact_phone && (
                      <div>
                        <span className="font-medium">Phone:</span> {player.emergency_contact_phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Medical Notes */}
            {player.medical_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Medical Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{player.medical_notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading performance data...</div>
                ) : performance.length > 0 ? (
                  <div className="space-y-4">
                    {performance.map((game, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">
                            vs {game.opponent || 'Opponent'}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {new Date(game.game_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>Points: {game.points || 0}</div>
                          <div>Assists: {game.assists || 0}</div>
                          <div>Rebounds: {game.rebounds || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Health Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading health data...</div>
                ) : healthData.length > 0 ? (
                  <div className="space-y-4">
                    {healthData.map((checkin, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">
                            Daily Check-in
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {new Date(checkin.check_in_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {checkin.energy_level && (
                            <div>Energy: {checkin.energy_level}/10</div>
                          )}
                          {checkin.sleep_hours && (
                            <div>Sleep: {checkin.sleep_hours}h</div>
                          )}
                          {checkin.mood && (
                            <div>Mood: {checkin.mood}/10</div>
                          )}
                          {checkin.training_readiness && (
                            <div>Readiness: {checkin.training_readiness}/10</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No health data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shotiq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  ShotIQ Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {player.total_shots && player.total_shots > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {player.shooting_percentage?.toFixed(1) || '0'}%
                      </div>
                      <div className="text-sm text-muted-foreground">Shooting Percentage</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {player.total_makes || 0}/{player.total_shots || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Makes/Attempts</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {player.total_sessions || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Sessions</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {player.avg_arc_degrees?.toFixed(1) || 'N/A'}°
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Arc</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No ShotIQ data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailsModal;