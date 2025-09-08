import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, UserX, Clock, FileText, CheckSquare, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PlayerProfile {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  full_name: string;
  email: string;
  phone?: string;
  team_name: string;
  team_id: string;
}

interface AttendanceRecord {
  player_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface NewAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  teamIds: string[];
}

const NewAttendanceModal: React.FC<NewAttendanceModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  teamIds
}) => {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch players using separate queries to avoid relationship issues
  const fetchPlayersAndAttendance = useCallback(async () => {
    if (!teamIds?.length) {
      setError('No teams selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get player-team relationships
      const { data: playerTeamData, error: playerTeamError } = await supabase
        .from('player_teams')
        .select('player_id, team_id')
        .in('team_id', teamIds)
        .eq('is_active', true);

      if (playerTeamError) throw playerTeamError;

      if (!playerTeamData?.length) {
        setPlayers([]);
        setAttendance({});
        setLoading(false);
        return;
      }

      const playerIds = [...new Set(playerTeamData.map(pt => pt.player_id))];
      
      // Step 2: Get player details
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          jersey_number,
          position,
          profiles!inner(
            full_name,
            email,
            phone
          )
        `)
        .in('id', playerIds)
        .eq('is_active', true);

      if (playersError) throw playersError;

      // Step 3: Get team names
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      if (teamsError) throw teamsError;

      // Step 4: Get existing attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('player_attendance')
        .select('player_id, status, notes')
        .eq('schedule_id', eventId);

      if (attendanceError) throw attendanceError;

      // Combine all data
      const teamsMap = new Map(teamsData?.map(t => [t.id, t.name]) || []);
      const playerTeamMap = new Map(playerTeamData.map(pt => [pt.player_id, pt.team_id]));

      const combinedPlayers: PlayerProfile[] = (playersData || []).map(player => {
        const teamId = playerTeamMap.get(player.id) || '';
        return {
          id: player.id,
          user_id: player.user_id,
          jersey_number: player.jersey_number || undefined,
          position: player.position || undefined,
          full_name: player.profiles?.full_name || 'Unknown Player',
          email: player.profiles?.email || '',
          phone: player.profiles?.phone || undefined,
          team_name: teamsMap.get(teamId) || 'Unknown Team',
          team_id: teamId
        };
      });

      // Initialize attendance state
      const attendanceMap: Record<string, AttendanceRecord> = {};
      combinedPlayers.forEach(player => {
        const existingRecord = attendanceData?.find(a => a.player_id === player.id);
        attendanceMap[player.id] = {
          player_id: player.id,
          status: (existingRecord?.status as 'present' | 'absent' | 'late' | 'excused') || 'present',
          notes: existingRecord?.notes || ''
        };
      });

      setPlayers(combinedPlayers);
      setAttendance(attendanceMap);
      
    } catch (error: any) {
      console.error('Error fetching attendance data:', error);
      setError(error.message || 'Failed to load attendance data');
      toast({
        title: "Error",
        description: "Failed to load players and attendance data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [teamIds, eventId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchPlayersAndAttendance();
    } else {
      // Reset state when modal closes
      setPlayers([]);
      setAttendance({});
      setSelectedPlayers(new Set());
      setError(null);
    }
  }, [isOpen, fetchPlayersAndAttendance]);

  const updateAttendance = useCallback((playerId: string, field: keyof AttendanceRecord, value: any) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }));
  }, []);

  const togglePlayerSelection = useCallback((playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  }, []);

  const selectAllPlayers = useCallback(() => {
    setSelectedPlayers(new Set(players.map(p => p.id)));
  }, [players]);

  const deselectAllPlayers = useCallback(() => {
    setSelectedPlayers(new Set());
  }, []);

  const applyBulkStatus = useCallback(() => {
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
  }, [selectedPlayers, bulkStatus, updateAttendance, toast]);

  const saveAttendance = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save attendance.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const attendanceRecords = Object.values(attendance).map(record => ({
        player_id: record.player_id,
        schedule_id: eventId,
        status: record.status,
        notes: record.notes || null,
        marked_by: user.id,
        marked_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('player_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'player_id,schedule_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Attendance saved for ${attendanceRecords.length} player(s).`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [attendance, eventId, user?.id, onClose, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4 text-success" />;
      case 'late': return <Clock className="h-4 w-4 text-warning" />;
      case 'absent': return <UserX className="h-4 w-4 text-destructive" />;
      case 'excused': return <FileText className="h-4 w-4 text-info" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  const attendanceStats = players.reduce((stats, player) => {
    const status = attendance[player.id]?.status || 'present';
    stats[status] = (stats[status] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance - {eventTitle}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2" 
                onClick={fetchPlayersAndAttendance}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Badge variant="default" className="bg-success/10 text-success border-success/20">
                    Present: {attendanceStats.present || 0}
                  </Badge>
                  <Badge variant="default" className="bg-warning/10 text-warning border-warning/20">
                    Late: {attendanceStats.late || 0}
                  </Badge>
                  <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20">
                    Absent: {attendanceStats.absent || 0}
                  </Badge>
                  <Badge variant="default" className="bg-info/10 text-info border-info/20">
                    Excused: {attendanceStats.excused || 0}
                  </Badge>
                  <Badge variant="outline">
                    Total: {players.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {players.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No players found for the selected teams. Make sure players are assigned to these teams.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Bulk Operations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
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
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deselectAllPlayers}
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
                        >
                          Apply to Selected ({selectedPlayers.size})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Player List */}
                <div className="space-y-3">
                  {players.map((player) => (
                    <Card key={player.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedPlayers.has(player.id)}
                              onCheckedChange={() => togglePlayerSelection(player.id)}
                            />
                            <div className="flex items-center gap-2">
                              {getStatusIcon(attendance[player.id]?.status || 'present')}
                              <div>
                                <p className="font-medium">{player.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {player.jersey_number ? `#${player.jersey_number}` : 'No Jersey'} • 
                                  {player.position || 'No Position'} • 
                                  {player.team_name}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Select
                              value={attendance[player.id]?.status || 'present'}
                              onValueChange={(value) => updateAttendance(player.id, 'status', value)}
                            >
                              <SelectTrigger className="w-full sm:w-32">
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
                              className="w-full sm:w-48 min-h-[40px] max-h-[80px]"
                              rows={1}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button 
                onClick={saveAttendance} 
                disabled={saving || players.length === 0}
                className="flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewAttendanceModal;