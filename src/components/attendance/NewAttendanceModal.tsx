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

interface PlayerWithAttendance {
  id: string;
  user_id: string;
  jersey_number?: number;
  position?: string;
  full_name: string;
  email: string;
  phone?: string;
  team_name: string;
  team_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  hasExistingRecord: boolean;
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
  const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Single comprehensive query to fetch all necessary data
  const fetchAttendanceData = useCallback(async () => {
    if (!teamIds?.length) {
      setError('No teams selected for this event');
      setLoading(false);
      return;
    }

    console.log('🔍 Fetching attendance data for teams:', teamIds);
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get player-team relationships for the selected teams
      const { data: playerTeams, error: ptError } = await supabase
        .from('player_teams')
        .select('player_id, team_id')
        .in('team_id', teamIds)
        .eq('is_active', true);

      console.log('👥 Player teams:', { playerTeams, ptError });

      if (ptError) throw ptError;
      if (!playerTeams?.length) {
        setPlayers([]);
        return;
      }

      const playerIds = [...new Set(playerTeams.map(pt => pt.player_id))];
      
      // Step 2: Get player details with profiles (only approved)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          jersey_number,
          position,
          is_active
        `)
        .in('id', playerIds)
        .eq('is_active', true);

      console.log('🏀 Players data:', { playersData, playersError });

      if (playersError) throw playersError;
      if (!playersData?.length) {
        setPlayers([]);
        return;
      }

      const userIds = playersData.map(p => p.user_id);
      console.log('🔍 Looking for profiles with IDs:', userIds);

      // Step 3: Get profiles (all players - RLS handles security)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, approval_status')
        .in('id', userIds);

      console.log('👤 Profiles data:', { profilesData, profilesError });

      // DIAGNOSTIC: Check what profiles exist vs what we're looking for
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, approval_status')
        .limit(10);
      console.log('🔍 Sample of all profiles in database:', allProfiles);

      if (profilesError) throw profilesError;
      if (!profilesData?.length) {
        setPlayers([]);
        setError(`No profiles found for user IDs: ${userIds.join(', ')}. Check if profiles exist for these users.`);
        return;
      }

      // Step 4: Get team names
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, is_active')
        .in('id', teamIds)
        .eq('is_active', true);

      console.log('🏆 Teams data:', { teamsData, teamsError });

      if (teamsError) throw teamsError;

      // Step 5: Get existing attendance records
      const { data: existingAttendance, error: attendanceError } = await supabase
        .from('player_attendance')
        .select('player_id, status, notes')
        .eq('schedule_id', eventId);

      console.log('📝 Existing attendance:', { existingAttendance, attendanceError });

      if (attendanceError) throw attendanceError;

      // Build lookup maps
      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      const teamsMap = new Map((teamsData || []).map(t => [t.id, t.name]));
      const playerTeamMap = new Map(playerTeams.map(pt => [pt.player_id, pt.team_id]));
      const attendanceMap = new Map((existingAttendance || []).map(att => [att.player_id, att]));

      // Combine all data - only include players with approved profiles
      const combinedPlayers: PlayerWithAttendance[] = playersData
        .filter(player => profilesMap.has(player.user_id))
        .map(player => {
          const profile = profilesMap.get(player.user_id)!;
          const teamId = playerTeamMap.get(player.id) || '';
          const existingRecord = attendanceMap.get(player.id);
          
          return {
            id: player.id,
            user_id: player.user_id,
            jersey_number: player.jersey_number || undefined,
            position: player.position || undefined,
            full_name: profile.full_name || 'Unknown Player',
            email: profile.email || '',
            phone: profile.phone || undefined,
            team_name: teamsMap.get(teamId) || 'Unknown Team',
            team_id: teamId,
            status: (existingRecord?.status as any) || 'present',
            notes: existingRecord?.notes || '',
            hasExistingRecord: !!existingRecord
          };
        });

      console.log(`✅ Successfully processed ${combinedPlayers.length} players:`, combinedPlayers);

      setPlayers(combinedPlayers);
      
      // Show success message
      if (combinedPlayers.length > 0) {
        console.log(`🎉 Found ${combinedPlayers.length} approved players across ${teamIds.length} teams`);
      } else {
        console.warn('⚠️ No approved players found for the selected teams');
        setError('No approved players found for the selected teams. Please check team assignments and player approval status.');
      }
      
    } catch (error: any) {
      console.error('💥 Fatal error fetching attendance data:', error);
      setError(`Failed to load attendance data: ${error.message}`);
      toast({
        title: "Error Loading Data",
        description: error.message || 'Failed to load players and attendance data.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [teamIds, eventId, toast]);

  useEffect(() => {
    if (isOpen) {
      console.log('🚀 Modal opened, starting data fetch...');
      fetchAttendanceData();
    } else {
      // Reset state when modal closes
      console.log('🔄 Modal closed, resetting state...');
      setPlayers([]);
      setSelectedPlayers(new Set());
      setError(null);
    }
  }, [isOpen, fetchAttendanceData]);

  const updatePlayerStatus = useCallback((playerId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, status } : player
    ));
  }, []);

  const updatePlayerNotes = useCallback((playerId: string, notes: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, notes } : player
    ));
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

    setPlayers(prev => prev.map(player => 
      selectedPlayers.has(player.id) ? { ...player, status: bulkStatus } : player
    ));

    toast({
      title: "Bulk Status Applied",
      description: `Applied "${bulkStatus}" status to ${selectedPlayers.size} player(s).`,
    });

    setSelectedPlayers(new Set());
  }, [selectedPlayers, bulkStatus, toast]);

  const saveAttendance = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save attendance.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const attendanceRecords = players.map(player => ({
        player_id: player.id,
        schedule_id: eventId,
        status: player.status,
        notes: player.notes?.trim() || null,
        marked_by: user.id,
        marked_at: new Date().toISOString()
      }));

      console.log('💾 Saving attendance records:', attendanceRecords);

      const { error } = await supabase
        .from('player_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'player_id,schedule_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Attendance Saved",
        description: `Successfully saved attendance for ${attendanceRecords.length} player(s).`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('💥 Error saving attendance:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [players, eventId, user?.id, onClose, toast]);

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
    stats[player.status] = (stats[player.status] || 0) + 1;
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
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
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
                onClick={fetchAttendanceData}
                disabled={loading}
              >
                Try Again
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
                  No approved players found for the selected teams. Please verify:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Players are assigned to these teams</li>
                    <li>Players have approved status</li>
                    <li>Players are marked as active</li>
                  </ul>
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
                              {getStatusIcon(player.status)}
                              <div>
                                <p className="font-medium">{player.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {player.jersey_number ? `#${player.jersey_number}` : 'No Jersey'} • 
                                  {player.position || 'No Position'} • 
                                  {player.team_name}
                                  {player.hasExistingRecord && (
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-1 rounded">
                                      Previously Recorded
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Select
                              value={player.status}
                              onValueChange={(value: any) => updatePlayerStatus(player.id, value)}
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
                              value={player.notes || ''}
                              onChange={(e) => updatePlayerNotes(player.id, e.target.value)}
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
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveAttendance}
                disabled={saving || players.length === 0}
                className="flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : `Save Attendance (${players.length})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewAttendanceModal;