import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlayerWithAttendance } from '@/utils/attendanceHelpers';

interface UseAttendanceOperationsProps {
  eventId: string;
  teamId: string;
  eventTitle: string;
  onSuccess?: () => void;
}

export const useAttendanceOperations = ({ 
  eventId, 
  teamId,
  eventTitle, 
  onSuccess 
}: UseAttendanceOperationsProps) => {
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const saveAttendance = async (
    attendance: Record<string, { player_id: string; status: string; notes?: string }>,
    players: PlayerWithAttendance[],
    autoDeductMembership: boolean = true
  ) => {
    if (!user?.id) {
      throw new Error('User must be authenticated to save attendance');
    }

    setSaving(true);
    
    try {
      // Prepare records for batch RPC call
      const attendanceRecords = Object.values(attendance).map(record => {
        const player = players.find(p => p.id === record.player_id);
        return {
          event_id: eventId,
          team_id: player?.team_id || teamId || null,
          player_id: record.player_id,
          status: record.status,
          notes: record.notes || null
        };
      });

      // Call the new RPC function
      const { error } = await supabase.rpc('rpc_save_attendance_batch', {
        p_records: attendanceRecords
      });

      if (error) {
        throw error;
      }

      // Apply membership deductions for players marked as present
      if (autoDeductMembership) {
        const presentAttendance = Object.values(attendance).filter(record => record.status === 'present');
        
        for (const record of presentAttendance) {
          try {
            await supabase.rpc('rpc_apply_attendance_membership', {
              p_player_id: record.player_id,
              p_event_id: eventId
            });
          } catch (membershipError) {
            console.warn('Failed to deduct membership for player:', record.player_id, membershipError);
            // Don't fail the entire operation if membership deduction fails
          }
        }
      }
      
      toast({
        title: "Success",
        description: 'Attendance saved successfully - membership classes deducted automatically',
      });
      
      onSuccess?.();
      return { success: true };

    } catch (error: any) {
      console.error('Error saving attendance:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance.",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    saveAttendance
  };
};