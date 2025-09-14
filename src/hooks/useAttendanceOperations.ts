import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveAttendanceRecords,
  PlayerWithAttendance
} from '@/utils/attendanceHelpers';

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
      // Use new RPC function that handles both attendance and membership automatically
      const result = await saveAttendanceRecords(eventId, teamId, attendance);
      const results = result.results;
      
      // Count successful credit deductions
      const creditedPlayers = results?.filter(r => r.credited)?.length || 0;
      const totalPresent = results?.filter(r => r.status === 'present')?.length || 0;

      // Show success feedback
      let description = "Attendance updated successfully.";
      if (autoDeductMembership && totalPresent > 0) {
        if (creditedPlayers > 0) {
          description += ` ${creditedPlayers} player(s) had membership credits deducted.`;
        }
        if (creditedPlayers < totalPresent) {
          description += ` ${totalPresent - creditedPlayers} player(s) had no remaining credits.`;
        }
      }
      
      toast({
        title: "Success",
        description,
      });

      onSuccess?.();
      return { success: true, results };

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