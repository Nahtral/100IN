import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, UserCheck, UserX, Clock, FileText, CheckSquare, Square, CreditCard } from 'lucide-react';
import PlayerDetailsModal from '@/components/player-details/PlayerDetailsModal';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { useAttendanceOperations } from '@/hooks/useAttendanceOperations';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  player_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  teamIds: string[];
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  teamIds
}) => {
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [autoDeductMembership, setAutoDeductMembership] = useState(true);
  const [playerDetailsModal, setPlayerDetailsModal] = useState<{
    isOpen: boolean;
    player: any | null;
  }>({
    isOpen: false,
    player: null
  });

  const { toast } = useToast();

  // Use the new centralized hooks
  const { players, loading, error, refetch } = useAttendanceData(eventId, teamIds, isOpen);
  const { saving, saveAttendance } = useAttendanceOperations({
    eventId,
    eventTitle,
    onSuccess: () => {
      onClose();
      refetch();
    }
  });

  // Initialize attendance state when players data is loaded
  useEffect(() => {
    if (players.length > 0) {
      const attendanceMap: Record<string, AttendanceRecord> = {};
      players.forEach(player => {
        attendanceMap[player.id] = {
          player_id: player.id,
          status: player.status,
          notes: player.notes || ''
        };
      });
      setAttendance(attendanceMap);
    }
  }, [players]);

  const updateAttendance = (playerId: string, field: keyof AttendanceRecord, value: any) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(new Set(players.map(p => p.id)));
  };

  const deselectAllPlayers = () => {
    setSelectedPlayers(new Set());
  };

  const applyBulkStatus = () => {
    if (selectedPlayers.size === 0) {
      toast({
        title: "No Players Selected",
        description: "Please select players to apply bulk status.",
        variant: "destructive",
      });
      return;
    }

    selectedPlayers.forEach(playerId => {
      updateAttendance(playerId, 'status', bulkStatus);
    });

    toast({
      title: "Bulk Status Applied",
      description: `Applied "${bulkStatus}" status to ${selectedPlayers.size} player(s).`,
    });

    setSelectedPlayers(new Set());
  };

  const handleSaveAttendance = async () => {
    try {
      await saveAttendance(attendance, players, autoDeductMembership);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Save attendance failed:', error);
    }
  };

  const openPlayerDetails = (player: any) => {
    setPlayerDetailsModal({
      isOpen: true,
      player
    });
  };

  const refreshPlayerData = () => {
    refetch();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'absent': return <UserX className="h-4 w-4 text-red-600" />;
      case 'excused': return <FileText className="h-4 w-4 text-blue-600" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const attendanceStats = players.reduce((stats, player) => {
    const status = attendance[player.id]?.status || 'present';
    stats[status] = (stats[status] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5" />
            Attendance - {eventTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading players...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={refetch} className="mt-4">
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 sm:gap-4 flex-wrap">
                  <Badge className="bg-green-100 text-green-800 transition-all duration-200 hover:scale-105">
                    Present: {attendanceStats.present || 0}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 transition-all duration-200 hover:scale-105">
                    Late: {attendanceStats.late || 0}
                  </Badge>
                  <Badge className="bg-red-100 text-red-800 transition-all duration-200 hover:scale-105">
                    Absent: {attendanceStats.absent || 0}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 transition-all duration-200 hover:scale-105">
                    Excused: {attendanceStats.excused || 0}
                  </Badge>
                  <Badge variant="outline" className="transition-all duration-200 hover:scale-105">
                    Total: {players.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Membership Settings */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Membership Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-deduct" className="text-sm font-medium">
                      Auto-deduct class usage for present players
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically deduct 1 class from each player's membership when marked present
                    </p>
                  </div>
                  <Switch
                    id="auto-deduct"
                    checked={autoDeductMembership}
                    onCheckedChange={setAutoDeductMembership}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bulk Operations */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Bulk Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllPlayers}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllPlayers}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      Deselect All
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 flex-1">
                    <Select value={bulkStatus} onValueChange={(value: any) => setBulkStatus(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="excused">Excused</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      onClick={applyBulkStatus}
                      disabled={selectedPlayers.size === 0}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      Apply to Selected ({selectedPlayers.size})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player List */}
            <div className="space-y-3">
              {players.map((player, index) => (
                <Card 
                  key={player.id}
                  className="animate-fade-in transition-all duration-200 hover:scale-[1.01] hover:shadow-md cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => openPlayerDetails(player)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedPlayers.has(player.id)}
                          onCheckedChange={() => togglePlayerSelection(player.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${player.full_name || `Player #${player.jersey_number || 'N/A'}`}`}
                        />
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendance[player.id]?.status || 'present')}
                           <div>
                             <p className="font-medium">
                               {player.full_name || `Player #${player.jersey_number || 'N/A'}`}
                             </p>
                             <p className="text-xs sm:text-sm text-gray-600">
                               {player.jersey_number ? `#${player.jersey_number}` : 'No Jersey'} • {player.position || 'No Position'}
                             </p>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <Select
                          value={attendance[player.id]?.status || 'present'}
                          onValueChange={(value) => updateAttendance(player.id, 'status', value)}
                        >
                          <SelectTrigger 
                            className="w-full sm:w-32 transition-all duration-200 hover:scale-105"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Textarea
                          placeholder="Notes (optional)"
                          value={attendance[player.id]?.notes || ''}
                          onChange={(e) => updateAttendance(player.id, 'notes', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full sm:w-48 min-h-[40px] max-h-[80px] transition-all duration-200 focus:scale-105"
                          rows={1}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving} className="transition-all duration-200 hover:scale-105">
                Cancel
              </Button>
              <Button onClick={handleSaveAttendance} disabled={saving} className="transition-all duration-200 hover:scale-105">
                {saving ? 'Saving...' : (autoDeductMembership ? 'Save Attendance & Deduct Classes' : 'Save Attendance')}
              </Button>
            </div>
          </div>
        )}

        {/* Player Details Modal */}
        <PlayerDetailsModal
          isOpen={playerDetailsModal.isOpen}
          onClose={() => setPlayerDetailsModal({ isOpen: false, player: null })}
          player={playerDetailsModal.player}
          onUpdate={refreshPlayerData}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceModal;