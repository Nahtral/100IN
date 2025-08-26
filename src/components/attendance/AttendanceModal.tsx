import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserCheck, UserX, Clock, FileText, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  profiles?: {
    full_name: string;
  } | null;
}

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
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && teamIds.length > 0) {
      fetchPlayersAndAttendance();
    }
  }, [isOpen, teamIds, eventId]);

  const fetchPlayersAndAttendance = async () => {
    setLoading(true);
    try {
      // Fetch regular players from selected teams with their profile info
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          jersey_number,
          position,
          team_id,
          profiles(full_name)
        `)
        .in('team_id', teamIds)
        .eq('is_active', true);

      if (playersError) {
        console.error('Players query error:', playersError);
        throw playersError;
      }

      // Fetch manual players for this specific event
      const { data: manualPlayersData, error: manualPlayersError } = await supabase
        .from('manual_players')
        .select('*')
        .eq('schedule_id', eventId);

      if (manualPlayersError) {
        console.error('Manual players query error:', manualPlayersError);
        throw manualPlayersError;
      }

      console.log('Manual players data:', manualPlayersData);

      // Fetch existing attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('player_attendance')
        .select('*')
        .eq('schedule_id', eventId);

      if (attendanceError) throw attendanceError;

      // Combine regular players and manual players into a unified format
      const combinedPlayers: Player[] = [
        ...(playersData || []).map(player => ({
          id: player.id,
          user_id: player.user_id,
          jersey_number: player.jersey_number,
          position: player.position,
          team_id: player.team_id,
          profiles: player.profiles
        })),
        ...(manualPlayersData || []).map(manualPlayer => ({
          id: manualPlayer.id,
          user_id: null,
          jersey_number: manualPlayer.jersey_number,
          position: manualPlayer.position,
          team_id: null,
          profiles: { full_name: manualPlayer.name }
        }))
      ];

      console.log('Combined players:', combinedPlayers);

      setPlayers(combinedPlayers);
      
      // Initialize attendance state for all players (regular + manual)
      const attendanceMap: Record<string, AttendanceRecord> = {};
      combinedPlayers.forEach(player => {
        const existingRecord = attendanceData?.find(a => a.player_id === player.id);
        attendanceMap[player.id] = {
          player_id: player.id,
          status: (existingRecord?.status as 'present' | 'absent' | 'late' | 'excused') || 'present',
          notes: existingRecord?.notes || ''
        };
      });
      
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load players and attendance data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendanceRecords = Object.values(attendance).map(record => ({
        player_id: record.player_id,
        schedule_id: eventId,
        status: record.status,
        notes: record.notes || null,
        marked_by: user?.id
      }));

      const { error } = await supabase
        .from('player_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'player_id,schedule_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance updated successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
                  className="animate-fade-in transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedPlayers.has(player.id)}
                          onCheckedChange={() => togglePlayerSelection(player.id)}
                          aria-label={`Select ${player.profiles?.full_name || `Player #${player.jersey_number || 'N/A'}`}`}
                        />
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendance[player.id]?.status || 'present')}
                           <div>
                              <p className="font-medium">
                                {player.profiles?.full_name || 
                                 (player.jersey_number ? `Player #${player.jersey_number}` : 'Unknown Player')}
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
                          <SelectTrigger className="w-full sm:w-32 transition-all duration-200 hover:scale-105">
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
              <Button onClick={saveAttendance} disabled={saving} className="transition-all duration-200 hover:scale-105">
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceModal;