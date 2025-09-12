import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Evaluation {
  id: string;
  player_id: string;
  video_url: string;
  video_filename: string;
  video_size_mb: number;
  analysis_status: string;
  analysis_data: any;
  shooting_score: number | null;
  passing_score: number | null;
  dribbling_score: number | null;
  foot_speed_score: number | null;
  vertical_jump_score: number | null;
  movement_score: number | null;
  body_alignment_score: number | null;
  injury_risk_level: string | null;
  development_plan: string | null;
  feedback: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  player?: {
    user_id: string;
    profiles?: {
      full_name: string;
      email: string;
    };
  };
}

interface UseEvaluationsReturn {
  evaluations: Evaluation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  uploadEvaluation: (file: File, playerId: string) => Promise<string>;
  updateEvaluation: (id: string, updates: Partial<Evaluation>) => Promise<void>;
}

export const useEvaluations = (): UseEvaluationsReturn => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('evaluations')
        .select(`
          *,
          player:players(
            user_id,
            profiles:profiles(
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setEvaluations((data as unknown as Evaluation[]) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch evaluations';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const uploadEvaluation = useCallback(async (file: File, playerId: string): Promise<string> => {
    try {
      // Upload video file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evaluations')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('evaluations')
        .getPublicUrl(fileName);

      // Create evaluation record
      const { data: evaluation, error: insertError } = await supabase
        .from('evaluations')
        .insert({
          player_id: playerId,
          video_url: publicUrl,
          video_filename: file.name,
          video_size_mb: file.size / (1024 * 1024),
          analysis_status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger analysis
      await supabase.functions.invoke('analyze-video-technique', {
        body: { evaluationId: evaluation.id, videoUrl: publicUrl }
      });

      toast({
        title: "Success",
        description: "Evaluation uploaded and analysis started",
      });

      // Refresh evaluations
      await fetchEvaluations();

      return evaluation.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload evaluation';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchEvaluations, toast]);

  const updateEvaluation = useCallback(async (id: string, updates: Partial<Evaluation>) => {
    try {
      const { error: updateError } = await supabase
        .from('evaluations')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setEvaluations(prev => 
        prev.map(evaluation => evaluation.id === id ? { ...evaluation, ...updates } : evaluation)
      );

      toast({
        title: "Success",
        description: "Evaluation updated successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update evaluation';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  useEffect(() => {
    fetchEvaluations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('evaluations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'evaluations'
      }, () => {
        fetchEvaluations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchEvaluations]);

  return {
    evaluations,
    loading,
    error,
    refetch: fetchEvaluations,
    uploadEvaluation,
    updateEvaluation,
  };
};