import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GradingData {
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
}

interface PlayerGrade {
  playerId: string;
  grades: GradingData;
  overall: number;
  lastSaved?: Date;
}

export const useProductionGrading = (eventId?: string) => {
  const [grades, setGrades] = useState<Map<string, PlayerGrade>>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch existing grades for the event
  const fetchGrades = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_player_grades')
        .select('*')
        .eq('schedule_id', eventId);

      if (error) {
        console.error('Error fetching grades:', error);
        return;
      }

      const gradeMap = new Map<string, PlayerGrade>();
      data?.forEach((grade) => {
        const gradingData: GradingData = {
          shooting: grade.shooting || undefined,
          ball_handling: grade.ball_handling || undefined,
          passing: grade.passing || undefined,
          rebounding: grade.rebounding || undefined,
          footwork: grade.footwork || undefined,
          decision_making: grade.decision_making || undefined,
          consistency: grade.consistency || undefined,
          communication: grade.communication || undefined,
          cutting: grade.cutting || undefined,
          teammate_support: grade.teammate_support || undefined,
          competitiveness: grade.competitiveness || undefined,
          coachable: grade.coachable || undefined,
          leadership: grade.leadership || undefined,
          reaction_time: grade.reaction_time || undefined,
          game_iq: grade.game_iq || undefined,
          boxout_frequency: grade.boxout_frequency || undefined,
          court_vision: grade.court_vision || undefined,
        };

        gradeMap.set(grade.player_id, {
          playerId: grade.player_id,
          grades: gradingData,
          overall: grade.overall_grade || 0,
          lastSaved: grade.updated_at ? new Date(grade.updated_at) : undefined
        });
      });

      setGrades(gradeMap);
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Save grades for a specific player
  const savePlayerGrades = useCallback(async (
    playerId: string, 
    gradingData: GradingData
  ): Promise<boolean> => {
    if (!eventId || !playerId) {
      toast.error('Invalid grading data');
      return false;
    }

    setSaving(prev => new Set(prev).add(playerId));

    try {
      const { error } = await supabase.rpc('rpc_save_event_grades', {
        p_event_id: eventId,
        p_player_id: playerId,
        p_metrics: gradingData as any
      });

      if (error) {
        console.error('Error saving grades:', error);
        toast.error(`Failed to save grades: ${error.message}`);
        return false;
      }

      // Update local state optimistically
      const overall = Object.values(gradingData).reduce((sum, val) => sum + (val || 0), 0) / 
                     Object.values(gradingData).filter(val => val !== undefined).length;

      setGrades(prev => new Map(prev).set(playerId, {
        playerId,
        grades: gradingData,
        overall: overall || 0,
        lastSaved: new Date()
      }));

      toast.success('Grades saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
      return false;
    } finally {
      setSaving(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  }, [eventId]);

  // Update local grades (before saving)
  const updatePlayerGrades = useCallback((playerId: string, gradingData: Partial<GradingData>) => {
    setGrades(prev => {
      const existing = prev.get(playerId);
      const newGrades = { ...existing?.grades, ...gradingData };
      const overall = Object.values(newGrades).reduce((sum, val) => sum + (val || 0), 0) / 
                     Object.values(newGrades).filter(val => val !== undefined).length;

      return new Map(prev).set(playerId, {
        playerId,
        grades: newGrades,
        overall: overall || 0,
        lastSaved: existing?.lastSaved
      });
    });
  }, []);

  // Get grades for a specific player
  const getPlayerGrades = useCallback((playerId: string): PlayerGrade | undefined => {
    return grades.get(playerId);
  }, [grades]);

  // Real-time subscription for grade updates
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`grades-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_player_grades',
          filter: `schedule_id=eq.${eventId}`
        },
        () => {
          // Refetch grades when changes occur
          fetchGrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchGrades]);

  // Fetch grades on component mount
  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  return {
    grades: Array.from(grades.values()),
    loading,
    saving,
    savePlayerGrades,
    updatePlayerGrades,
    getPlayerGrades,
    refetch: fetchGrades
  };
};