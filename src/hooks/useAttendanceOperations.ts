import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatAttendanceRecords,
  saveAttendanceRecords,
  processMembershipDeductions,
  PlayerWithAttendance
} from '@/utils/attendanceHelpers';

interface UseAttendanceOperationsProps {
  eventId: string;
  eventTitle: string;
  onSuccess?: () => void;
}

export const useAttendanceOperations = ({ 
  eventId, 
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
      // Format and validate attendance records
      const attendanceRecords = formatAttendanceRecords(attendance, eventId, user.id);
      
      // Save attendance records
      await saveAttendanceRecords(attendanceRecords);

      // Handle membership deduction if enabled
      let membershipResults = null;
      if (autoDeductMembership) {
        const presentPlayerIds = attendanceRecords
          .filter(record => record.status === 'present')
          .map(record => record.player_id);

        if (presentPlayerIds.length > 0) {
          const playersMap = new Map(players.map(p => [p.id, p]));
          membershipResults = await processMembershipDeductions(
            presentPlayerIds,
            eventTitle,
            user.id,
            playersMap
          );
        }
      }

      // Show success feedback
      if (membershipResults) {
        let description = '';
        if (membershipResults.successfulDeductions > 0) {
          description += `Successfully deducted classes for ${membershipResults.successfulDeductions} player(s). `;
        }
        if (membershipResults.errors.length > 0) {
          description += `${membershipResults.errors.length} membership deduction(s) failed. `;
        }
        
        toast({
          title: "Attendance & Membership Updated",
          description: description.trim() || "Attendance updated successfully.",
          variant: membershipResults.errors.length > 0 ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Success",
          description: "Attendance updated successfully.",
        });
      }

      onSuccess?.();
      return { success: true, membershipResults };

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