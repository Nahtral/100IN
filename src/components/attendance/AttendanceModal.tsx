import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, UserX, Clock, FileText, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  user_id?: string;
  jersey_number?: number;
  position?: string;
  team_id?: string;
  profiles?: {
    full_name: string;
  } | null;
  // For manual players
  manual_entry_name?: string;
  is_manual?: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlayersAndAttendance();
    }
  }, [isOpen, teamIds, eventId]);

  const fetchPlayersAndAttendance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allPlayers: Player[] = [];
      
      // Fetch registered players if team IDs are provided
      if (teamIds && teamIds.length > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select(`
            id,
            user_id,
            jersey_number,
            position,
            team_id,
            manual_entry_name,
            profiles!left(full_name)
          `)
          .in('team_id', teamIds)
          .eq('is_active', true);

        if (playersError) {
          console.error('Players query error:', playersError);
          setError(`Failed to fetch team players: ${playersError.message}`);
          return;
        }

        if (playersData) {
          allPlayers.push(...playersData.map(p => ({
            id: p.id,
            user_id: p.user_id,
            jersey_number: p.jersey_number,
            position: p.position,
            team_id: p.team_id,
            manual_entry_name: p.manual_entry_name,
            is_manual: false,
            profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
          }) as Player));
        }
      }

      // Fetch manual players for this specific event
      const { data: manualPlayersData, error: manualPlayersError } = await supabase
        .from('manual_players')
        .select('*')
        .eq('schedule_id', eventId);

      if (manualPlayersError) {
        console.error('Manual players query error:', manualPlayersError);
        // Don't fail completely for manual players error
      } else if (manualPlayersData) {
        // Add manual players to the list
        allPlayers.push(...manualPlayersData.map(mp => ({
          id: mp.id,
          jersey_number: mp.jersey_number,
          position: mp.position,
          manual_entry_name: mp.name,
          is_manual: true,
          profiles: null
        })));
      }

      // Fetch existing attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('player_attendance')
        .select('*')
        .eq('schedule_id', eventId);

      if (attendanceError) {
        console.error('Attendance query error:', attendanceError);
        setError(`Failed to fetch attendance data: ${attendanceError.message}`);
        return;
      }

      setPlayers(allPlayers);
      
      // Initialize attendance state
      const attendanceMap: Record<string, AttendanceRecord> = {};
      allPlayers.forEach(player => {
        const existingRecord = attendanceData?.find(a => a.player_id === player.id);
        attendanceMap[player.id] = {
          player_id: player.id,
          status: (existingRecord?.status as 'present' | 'absent' | 'late' | 'excused') || 'present',
          notes: existingRecord?.notes || ''
        };
      });
      
      setAttendance(attendanceMap);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setError(`Failed to load player data: ${errorMessage}`);
      toast({
        title: "Error",
        description: errorMessage,
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
        marked_by: user?.id,
        marked_at: new Date().toISOString()
      }));

      // Use upsert with proper conflict resolution
      const { error } = await supabase
        .from('player_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'player_id,schedule_id'
        });

      if (error) {
        console.error('Save attendance error:', error);
        throw new Error(`Failed to save attendance: ${error.message}`);
      }

      toast({
        title: "Success",
        description: `Attendance updated successfully for ${attendanceRecords.length} players.`,
      });
      
      // Refresh data to confirm changes
      await fetchPlayersAndAttendance();
      
      // Don't close automatically - let user verify changes
      // onClose();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save attendance. Please try again.",
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
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPlayersAndAttendance} variant="outline">
              Try Again
            </Button>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Players Found</h3>
            <p className="text-muted-foreground">
              No players found for this event. Make sure teams are assigned to the event or add manual players.
            </p>
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
                          onCheckedChange={(checked) => togglePlayerSelection(player.id)}
                          aria-label={`Select ${player.is_manual 
                            ? player.manual_entry_name 
                            : (player.profiles?.full_name || `Player #${player.jersey_number || 'N/A'}`)
                          }`}
                        />
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendance[player.id]?.status || 'present')}
                            <div>
                              <p className="font-medium">
                                {player.is_manual 
                                  ? player.manual_entry_name 
                                  : (player.profiles?.full_name || `Player #${player.jersey_number || 'N/A'}`)
                                }
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {player.jersey_number ? `#${player.jersey_number}` : 'No Jersey'} • {player.position || 'No Position'}
                                {player.is_manual && <span className="ml-2 text-blue-600">• Manual Entry</span>}
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
            <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {players.filter(p => !p.is_manual).length} registered, {players.filter(p => p.is_manual).length} manual
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving} className="transition-all duration-200 hover:scale-105">
                  Cancel
                </Button>
                <Button onClick={saveAttendance} disabled={saving || players.length === 0} className="transition-all duration-200 hover:scale-105">
                  {saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceModal;