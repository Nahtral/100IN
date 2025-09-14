import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface GradingMetric {
  id: string;
  name: string;
  weight: number;
  is_active: boolean;
}

interface PlayerGrade {
  id: string;
  event_id: string;
  player_id: string;
  overall: number | null;
  updated_at: string;
}

interface PlayerGradeItem {
  id: string;
  grade_id: string;
  metric_id: string;
  score: number;
  priority: string | null;
}

interface GradeData {
  [metricId: string]: {
    score: number;
    priority: string;
  };
}

export const usePlayerGrading = (eventId?: string, playerId?: string) => {
  const [metrics, setMetrics] = useState<GradingMetric[]>([]);
  const [gradeData, setGradeData] = useState<GradeData>({});
  const [overallGrade, setOverallGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Debounce grade data changes
  const debouncedGradeData = useDebounce(gradeData, 300);

  // Fetch grading metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('grading_metrics')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMetrics(data || []);
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load grading metrics",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch existing grades for player
  const fetchPlayerGrades = useCallback(async () => {
    if (!eventId || !playerId) return;

    setLoading(true);
    try {
      // Get player grade header
      const { data: gradeHeader, error: gradeError } = await supabase
        .from('player_grades')
        .select('*')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (gradeError) throw gradeError;

      if (gradeHeader) {
        setOverallGrade(gradeHeader.overall);

        // Get grade items
        const { data: gradeItems, error: itemsError } = await supabase
          .from('player_grade_items')
          .select('*')
          .eq('grade_id', gradeHeader.id);

        if (itemsError) throw itemsError;

        // Convert to grade data format
        const newGradeData: GradeData = {};
        gradeItems?.forEach(item => {
          newGradeData[item.metric_id] = {
            score: item.score,
            priority: item.priority || 'medium'
          };
        });
        setGradeData(newGradeData);
      } else {
        // Initialize with default scores
        const defaultGradeData: GradeData = {};
        metrics.forEach(metric => {
          defaultGradeData[metric.id] = {
            score: 5,
            priority: 'medium'
          };
        });
        setGradeData(defaultGradeData);
        setOverallGrade(null);
      }
    } catch (error: any) {
      console.error('Error fetching player grades:', error);
      toast({
        title: "Error",
        description: "Failed to load player grades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, playerId, metrics, toast]);

  // Save grades to database
  const saveGrades = useCallback(async (data: GradeData) => {
    if (!eventId || !playerId || Object.keys(data).length === 0) return;

    setSaving(true);
    try {
      // Convert grade data to RPC format
      const items = Object.entries(data).map(([metricId, gradeInfo]) => ({
        metric_id: metricId,
        score: gradeInfo.score,
        priority: gradeInfo.priority
      }));

      const { data: result, error } = await supabase
        .rpc('rpc_save_player_grades', {
          p_event_id: eventId,
          p_player_id: playerId,
          p_items: items
        });

      if (error) throw error;

      // Update overall grade from result
      if (result && result[0]) {
        setOverallGrade(result[0].overall);
      }

    } catch (error: any) {
      console.error('Error saving grades:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save grades",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [eventId, playerId, toast]);

  // Update individual grade
  const updateGrade = useCallback((metricId: string, score: number, priority?: string) => {
    setGradeData(prev => ({
      ...prev,
      [metricId]: {
        score,
        priority: priority || prev[metricId]?.priority || 'medium'
      }
    }));
  }, []);

  // Reset grades to default
  const resetGrades = useCallback(() => {
    const defaultGradeData: GradeData = {};
    metrics.forEach(metric => {
      defaultGradeData[metric.id] = {
        score: 5,
        priority: 'medium'
      };
    });
    setGradeData(defaultGradeData);
    setOverallGrade(null);
  }, [metrics]);

  // Calculate overall grade client-side for immediate feedback
  const calculateOverall = useCallback(() => {
    if (Object.keys(gradeData).length === 0) return null;
    
    let total = 0;
    let totalWeight = 0;
    
    Object.entries(gradeData).forEach(([metricId, gradeInfo]) => {
      const metric = metrics.find(m => m.id === metricId);
      const weight = metric?.weight || 1;
      total += gradeInfo.score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round((total / totalWeight) * 100) / 100 : null;
  }, [gradeData, metrics]);

  // Auto-save when grade data changes (debounced)
  useEffect(() => {
    if (Object.keys(debouncedGradeData).length > 0) {
      saveGrades(debouncedGradeData);
    }
  }, [debouncedGradeData, saveGrades]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!eventId || !playerId) return;

    const channel = supabase
      .channel('player-grades-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_grades',
          filter: `event_id=eq.${eventId} and player_id=eq.${playerId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setOverallGrade((payload.new as any).overall);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, playerId]);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (metrics.length > 0) {
      fetchPlayerGrades();
    }
  }, [fetchPlayerGrades, metrics.length]);

  return {
    metrics,
    gradeData,
    overallGrade: overallGrade || calculateOverall(),
    loading,
    saving,
    updateGrade,
    resetGrades,
    refetch: fetchPlayerGrades
  };
};