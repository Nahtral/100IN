import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAttendanceSecure = () => {
  const [saving, setSaving] = useState(false);

  const saveAttendance = useCallback(async (
    eventId: string,
    teamId: string,
    playerId: string,
    status: string,
    notes?: string
  ): Promise<boolean> => {
    if (!eventId || !teamId || !playerId || !status) {
      toast.error('Invalid attendance data');
      return false;
    }

    setSaving(true);
    
    try {
      // Use the production-hardened RPC function with automatic membership deduction
      const { data, error } = await supabase.rpc('rpc_upsert_attendance', {
        p_event_id: eventId,
        p_team_id: teamId,
        p_player_id: playerId,
        p_status: status,
        p_notes: notes || null
      });

      if (error) {
        console.error('Attendance save error:', error);
        toast.error(`Failed to save attendance: ${error.message}`);
        return false;
      }

      const result = data as { success: boolean; status: string; membership_updated: boolean };
      
      if (result.membership_updated) {
        toast.success(`Attendance saved - ${status === 'present' ? 'Class deducted' : 'Class refunded'}`);
      } else {
        toast.success('Attendance saved successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected attendance error:', error);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    saveAttendance,
    saving
  };
};