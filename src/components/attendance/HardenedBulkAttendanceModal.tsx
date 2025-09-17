import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, AlertCircle, Loader2, UserCheck, UserX, Clock, CreditCard, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { useHardenedMembership } from '@/hooks/useHardenedMembership';
import { saveAttendanceRecords } from '@/utils/attendanceHelpers';
import { AttendanceSummary } from './AttendanceSummary';

interface PlayerWithMembership {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  team_id?: string;
  team_name?: string;
  position?: string;
  jersey_number?: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  hasExistingRecord?: boolean;
  membership?: {
    remaining_classes: number;
    allocated_classes: number;
    membership_type_name: string;
    should_deactivate: boolean;
    is_expired: boolean;
  } | null;
}

interface HardenedBulkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  teamIds: string[];
}

export const HardenedBulkAttendanceModal: React.FC<HardenedBulkAttendanceModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  teamIds
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [saving, setSaving] = useState(false);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  
  const {
    players,
    loading,
    error,
    refetch,
    updatePlayerStatus,
    updatePlayerNotes,
    updateBulkStatus,
  } = useAttendanceData(eventId, teamIds, isOpen);

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
    const selectedIds = Array.from(selectedPlayers);
    updateBulkStatus(selectedIds, bulkStatus);
    
    toast({
      title: "Bulk Status Applied",
      description: `Applied "${bulkStatus}" status to ${selectedIds.length} player(s).`,
    });
    
    setSelectedPlayers(new Set());
  }, [selectedPlayers, bulkStatus, updateBulkStatus, toast]);

  const saveAttendance = useCallback(async () => {
    setSaving(true);
    
    try {
      // Group players by team and save attendance using the hardened RPC
      const teamGroups = new Map<string, typeof players>();
      
      players.forEach(player => {
        const teamId = player.team_id;
        if (!teamId) {
          console.warn(`Player ${player.id} has no team_id, skipping`);
          return;
        }
        
        if (!teamGroups.has(teamId)) {
          teamGroups.set(teamId, []);
        }
        teamGroups.get(teamId)!.push(player);
      });

      console.log('💾 Saving bulk attendance for teams:', Array.from(teamGroups.keys()));

      let totalSaved = 0;
      
      // Save attendance for each team using the hardened RPC
      for (const [teamId, teamPlayers] of teamGroups) {
        const attendanceData: Record<string, { player_id: string; status: string; notes?: string }> = {};
        
        teamPlayers.forEach(player => {
          attendanceData[player.id] = {
            player_id: player.id,
            status: player.status,
            notes: player.notes?.trim() || ''
          };
        });

        const result = await saveAttendanceRecords(eventId, teamId, attendanceData);
        if (result.success) {
          totalSaved += teamPlayers.length;
        }
      }

      toast({
        title: "Attendance Saved",
        description: `Successfully saved attendance for ${totalSaved} player(s) with automatic membership updates.`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('💥 Error saving bulk attendance:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [players, eventId, onClose, toast]);

  const handleClose = useCallback(() => {
    setSelectedPlayers(new Set());
    setExpandedPlayers(new Set());
    onClose();
  }, [onClose]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-600 hover:bg-green-700"><UserCheck className="h-3 w-3 mr-1" />Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'late':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Late</Badge>;
      case 'excused':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Excused</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  const togglePlayerExpansion = useCallback((playerId: string) => {
    setExpandedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  }, []);

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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Attendance - {eventTitle}
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
                onClick={refetch}
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
            <AttendanceSummary players={players} />

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
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Bulk Operations ({selectedPlayers.size} selected)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllPlayers}
                        disabled={players.length === 0}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllPlayers}
                        disabled={selectedPlayers.size === 0}
                      >
                        Deselect All
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <Select value={bulkStatus} onValueChange={(value: any) => setBulkStatus(value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          onClick={applyBulkStatus}
                          disabled={selectedPlayers.size === 0}
                          size="sm"
                        >
                          Apply to Selected
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Players List with Membership Info */}
                <div className="space-y-3">
                  {players.map((player) => (
                    <HardenedPlayerCard
                      key={player.id}
                      player={player}
                      isSelected={selectedPlayers.has(player.id)}
                      isExpanded={expandedPlayers.has(player.id)}
                      onToggleSelection={togglePlayerSelection}
                      onToggleExpansion={togglePlayerExpansion}
                      onStatusChange={updatePlayerStatus}
                      onNotesChange={updatePlayerNotes}
                      getStatusBadge={getStatusBadge}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={saveAttendance} 
            disabled={saving || players.length === 0}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Bulk Attendance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Individual player card component with membership integration
interface HardenedPlayerCardProps {
  player: PlayerWithMembership;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelection: (playerId: string) => void;
  onToggleExpansion: (playerId: string) => void;
  onStatusChange: (playerId: string, status: 'present' | 'absent' | 'late' | 'excused') => void;
  onNotesChange: (playerId: string, notes: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

const HardenedPlayerCard: React.FC<HardenedPlayerCardProps> = ({
  player,
  isSelected,
  isExpanded,
  onToggleSelection,
  onToggleExpansion,
  onStatusChange,
  onNotesChange,
  getStatusBadge
}) => {
  const { membership, loading: membershipLoading } = useHardenedMembership(player.user_id);

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(player.id)}
            className="mt-1"
          />

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h4 className="font-medium">{player.full_name}</h4>
                  <p className="text-sm text-muted-foreground">{player.team_name || 'No Team'}</p>
                </div>
                {getStatusBadge(player.status)}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpansion(player.id)}
              >
                {isExpanded ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              </Button>
            </div>

            {/* Membership Status (always visible) */}
            {!membershipLoading && membership && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Membership Status</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div>Type: {membership.membership_type_name}</div>
                    <div>Remaining: {membership.remaining_classes}/{membership.allocated_classes}</div>
                  </div>
                  <div>
                    {membership.should_deactivate && (
                      <div className="text-amber-600 font-medium">⚠️ Expiring Soon</div>
                    )}
                    {membership.is_expired && (
                      <div className="text-red-600 font-medium">❌ Expired</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Expanded Controls */}
            {isExpanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(player.id, 'present')}
                    variant={player.status === 'present' ? 'default' : 'outline'}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Present
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(player.id, 'absent')}
                    variant={player.status === 'absent' ? 'destructive' : 'outline'}
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Absent
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(player.id, 'late')}
                    variant={player.status === 'late' ? 'secondary' : 'outline'}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Late
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(player.id, 'excused')}
                    variant={player.status === 'excused' ? 'secondary' : 'outline'}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Excused
                  </Button>
                </div>
                
                <div>
                  <textarea
                    className="w-full p-2 text-sm border rounded resize-none"
                    placeholder="Notes..."
                    rows={2}
                    value={player.notes || ''}
                    onChange={(e) => onNotesChange(player.id, e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};