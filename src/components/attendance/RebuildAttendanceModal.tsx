import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAttendanceData } from '@/hooks/useAttendanceData';
import { AttendanceSummary } from './AttendanceSummary';
import { BulkOperations } from './BulkOperations';
import { AttendancePlayerCard } from './AttendancePlayerCard';

interface RebuildAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  teamIds: string[];
}

export const RebuildAttendanceModal: React.FC<RebuildAttendanceModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  teamIds
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
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

  const handleClose = useCallback(() => {
    setSelectedPlayers(new Set());
    onClose();
  }, [onClose]);

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
                <BulkOperations
                  selectedPlayers={selectedPlayers}
                  bulkStatus={bulkStatus}
                  onBulkStatusChange={setBulkStatus}
                  onSelectAll={selectAllPlayers}
                  onDeselectAll={deselectAllPlayers}
                  onApplyBulkStatus={applyBulkStatus}
                />

                <div className="space-y-3">
                  {players.map((player) => (
                    <AttendancePlayerCard
                      key={player.id}
                      player={player}
                      isSelected={selectedPlayers.has(player.id)}
                      onToggleSelection={togglePlayerSelection}
                      onStatusChange={updatePlayerStatus}
                      onNotesChange={updatePlayerNotes}
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
            Save Attendance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};