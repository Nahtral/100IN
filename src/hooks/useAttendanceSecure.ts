import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AttendanceEntry {
  player_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface AttendanceResult {
  success_count: number;
  error_count: number;
  results: Array<{
    player_id: string;
    status: 'success' | 'error';
    message?: string;
  }>;
}

export const useAttendanceSecure = () => {
  const [saving, setSaving] = useState(false);

  const saveAttendance = useCallback(async (
    eventId: string,
    teamId: string,
    entries: AttendanceEntry[]
  ): Promise<AttendanceResult | null> => {
    if (!eventId || !teamId || !entries?.length) {
      toast.error('Invalid attendance data');
      return null;
    }

    setSaving(true);
    
    try {
      // Use the existing secure RPC function
      const { data, error } = await supabase.rpc('rpc_save_attendance_batch', {
        p_event_id: eventId,
        p_team_id: teamId,
        p_entries: entries as any
      });

      if (error) {
        console.error('Attendance save error:', error);
        toast.error(`Failed to save attendance: ${error.message}`);
        return null;
      }

      // Transform the response to match our interface
      const result: AttendanceResult = {
        success_count: Array.isArray(data) ? data.filter(r => r.status === 'success').length : 0,
        error_count: Array.isArray(data) ? data.filter(r => r.status === 'error').length : 0,
        results: Array.isArray(data) ? data.map(r => ({
          player_id: r.player_id,
          status: r.credited ? 'success' : 'error',
          message: r.credited ? undefined : 'Credit not applied'
        })) : []
      };
      
      if (result.success_count > 0) {
        toast.success(`Successfully saved attendance for ${result.success_count} players`);
      }
      
      if (result.error_count > 0) {
        toast.warning(`${result.error_count} players had errors`);
      }

      return result;
    } catch (error) {
      console.error('Unexpected attendance error:', error);
      toast.error('An unexpected error occurred');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    saveAttendance,
    saving
  };
};