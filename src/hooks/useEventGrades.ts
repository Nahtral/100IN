import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EventPlayerGrade {
  id: string;
  schedule_id: string;
  player_id: string;
  graded_by: string;
  shooting?: number;
  ball_handling?: number;
  passing?: number;
  rebounding?: number;
  footwork?: number;
  decision_making?: number;
  consistency?: number;
  communication?: number;
  cutting?: number;
  teammate_support?: number;
  competitiveness?: number;
  coachable?: number;
  leadership?: number;
  reaction_time?: number;
  game_iq?: number;
  boxout_frequency?: number;
  court_vision?: number;
  overall_grade?: number;
  notes?: string;
  event_type: string;
  created_at: string;
  updated_at: string;
  grader_profile?: {
    full_name: string;
  };
  player_profile?: {
    profiles: {
      full_name: string;
    };
    jersey_number?: number;
  };
}

export interface GradeFormData {
  shooting: number;
  ball_handling: number;
  passing: number;
  rebounding: number;
  footwork: number;
  decision_making: number;
  consistency: number;
  communication: number;
  cutting: number;
  teammate_support: number;
  competitiveness: number;
  coachable: number;
  leadership: number;
  reaction_time: number;
  game_iq: number;
  boxout_frequency: number;
  court_vision: number;
  notes?: string;
}

interface UseEventGradesReturn {
  grades: EventPlayerGrade[];
  loading: boolean;
  error: string | null;
  submitGrade: (playerId: string, gradeData: GradeFormData) => Promise<boolean>;
  updateGrade: (gradeId: string, gradeData: Partial<GradeFormData>) => Promise<boolean>;
  getPlayerGrade: (playerId: string) => EventPlayerGrade | undefined;
  refetch: () => void;
}

export const useEventGrades = (scheduleId?: string): UseEventGradesReturn => {
  const [grades, setGrades] = useState<EventPlayerGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGrades = async () => {
    if (!scheduleId) {
      setGrades([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('event_player_grades')
        .select(`
          *,
          grader_profile:profiles!graded_by(full_name),
          player_profile:players!player_id(
            profiles!user_id(full_name),
            jersey_number
          )
        `)
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setGrades(data || []);
    } catch (err: any) {
      console.error('Error fetching event grades:', err);
      setError(err.message || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const submitGrade = async (playerId: string, gradeData: GradeFormData): Promise<boolean> => {
    if (!scheduleId) return false;

    try {
      // Get event details for event_type
      const { data: eventData } = await supabase
        .from('schedules')
        .select('event_type')
        .eq('id', scheduleId)
        .single();

      // Calculate overall grade client-side as fallback (though trigger should handle this)
      const calculateOverallGrade = (data: GradeFormData): number => {
        const skills = [
          data.shooting, data.ball_handling, data.passing, data.rebounding,
          data.footwork, data.decision_making, data.consistency, data.communication,
          data.cutting, data.teammate_support, data.competitiveness, data.coachable,
          data.leadership, data.reaction_time, data.game_iq, data.boxout_frequency,
          data.court_vision
        ].filter(val => val !== undefined && val !== null) as number[];
        
        return skills.length > 0 ? Math.round((skills.reduce((a, b) => a + b, 0) / skills.length) * 100) / 100 : 0;
      };

      const overallGrade = calculateOverallGrade(gradeData);

      const { error } = await supabase
        .from('event_player_grades')
        .insert({
          schedule_id: scheduleId,
          player_id: playerId,
          event_type: eventData?.event_type || 'training',
          graded_by: (await supabase.auth.getUser()).data.user?.id!,
          overall_grade: overallGrade, // Include client-side calculation as fallback
          ...gradeData
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Grade Submitted",
        description: "Player grade has been saved successfully.",
      });

      fetchGrades(); // Refresh the data
      return true;
    } catch (err: any) {
      console.error('Error submitting grade:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit grade",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateGrade = async (gradeId: string, gradeData: Partial<GradeFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('event_player_grades')
        .update(gradeData)
        .eq('id', gradeId);

      if (error) {
        throw error;
      }

      toast({
        title: "Grade Updated",
        description: "Player grade has been updated successfully.",
      });

      fetchGrades(); // Refresh the data
      return true;
    } catch (err: any) {
      console.error('Error updating grade:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update grade",
        variant: "destructive",
      });
      return false;
    }
  };

  const getPlayerGrade = (playerId: string): EventPlayerGrade | undefined => {
    return grades.find(grade => grade.player_id === playerId);
  };

  useEffect(() => {
    fetchGrades();

    // Set up real-time subscription for grade updates
    if (scheduleId) {
      const channel = supabase
        .channel(`event-grades-${scheduleId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_player_grades',
            filter: `schedule_id=eq.${scheduleId}`
          },
          () => {
            fetchGrades();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [scheduleId]);

  return {
    grades,
    loading,
    error,
    submitGrade,
    updateGrade,
    getPlayerGrade,
    refetch: fetchGrades
  };
};