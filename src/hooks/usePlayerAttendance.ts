import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AttendanceStats {
  totalEvents: number;
  attendedEvents: number;
  attendancePercentage: number;
  currentStreak: number;
  lastAttendedDate: string | null;
  recentAttendance: Array<{
    id: string;
    event_date: string;
    event_title: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>;
}

interface UsePlayerAttendanceReturn {
  attendance: AttendanceStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerAttendance = (playerId?: string): UsePlayerAttendanceReturn => {
  const [attendance, setAttendance] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAttendance = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get player's attendance records with event details from new attendance table
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          id,
          player_id,
          event_id,
          status,
          notes,
          recorded_by,
          recorded_at,
          schedules!event_id(
            id,
            title,
            start_time,
            event_type
          )
        `)
        .eq('player_id', playerId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (attendanceError) {
        throw attendanceError;
      }

      const records = attendanceRecords || [];
      
      // Calculate statistics
      const totalEvents = records.length;
      const attendedEvents = records.filter(r => r.status === 'present').length;
      const attendancePercentage = totalEvents > 0 ? (attendedEvents / totalEvents) * 100 : 0;

      // Calculate current streak
      let currentStreak = 0;
      for (const record of records) {
        if (record.status === 'present') {
          currentStreak++;
        } else {
          break;
        }
      }

      // Get last attended date
      const lastAttended = records.find(r => r.status === 'present');
      const lastAttendedDate = lastAttended ? lastAttended.schedules.start_time : null;

      // Format recent attendance for display
      const recentAttendance = records.slice(0, 10).map(record => ({
        id: record.id,
        event_date: record.schedules.start_time,
        event_title: record.schedules.title,
        status: record.status as 'present' | 'absent' | 'late' | 'excused'
      }));

      setAttendance({
        totalEvents,
        attendedEvents,
        attendancePercentage,
        currentStreak,
        lastAttendedDate,
        recentAttendance
      });

    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError(err.message || 'Failed to load attendance data');
      toast({
        title: "Error",
        description: "Failed to load attendance information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [playerId]);

  return {
    attendance,
    loading,
    error,
    refetch: fetchAttendance
  };
};