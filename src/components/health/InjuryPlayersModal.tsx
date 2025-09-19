import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, AlertTriangle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useInjuryPlayers, InjuryPlayer } from '@/hooks/useInjuryBreakdown';
import { useNavigate } from 'react-router-dom';

interface InjuryPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  injuryLocation: string;
  injuryType: string;
  timeframeDays?: number;
}

export const InjuryPlayersModal: React.FC<InjuryPlayersModalProps> = ({
  isOpen,
  onClose,
  injuryLocation,
  injuryType,
  timeframeDays = 30
}) => {
  const [players, setPlayers] = useState<InjuryPlayer[]>([]);
  const { fetchPlayersWithInjury, loading } = useInjuryPlayers();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && injuryLocation) {
      loadPlayers();
    }
  }, [isOpen, injuryLocation, timeframeDays]);

  const loadPlayers = async () => {
    const playersData = await fetchPlayersWithInjury(injuryLocation, timeframeDays);
    setPlayers(playersData);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'mild': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200';
      case 'recovering': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cleared': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewPlayerDashboard = (playerId: string) => {
    navigate(`/dashboard?playerId=${playerId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {injuryType} - Player Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing players with {injuryLocation.toLowerCase()} injuries in the last {timeframeDays} days
            </p>
            <Badge variant="outline">
              {players.length} player{players.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <Separator />

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && players.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No players found with {injuryLocation.toLowerCase()} injuries.</p>
            </div>
          )}

          {!loading && players.length > 0 && (
            <div className="grid gap-4">
              {players.map((player, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{player.player_name}</h3>
                          {player.team_name && (
                            <Badge variant="secondary">{player.team_name}</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">{player.injury_type}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">
                              {format(new Date(player.date_occurred), 'MMM dd, yyyy')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Severity:</span>
                            <Badge className={getSeverityColor(player.severity)}>
                              {player.severity}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={getStatusColor(player.status)}>
                              {player.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPlayerDashboard(player.player_id)}
                        className="ml-4"
                      >
                        View Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};