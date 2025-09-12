import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShotSession {
  id: string;
  player_id: string;
  session_date: string;
  total_shots: number;
  made_shots: number;
  shooting_percentage: number;
  avg_arc: number;
  avg_depth: number;
  session_duration_minutes: number;
  notes?: string;
  created_at: string;
}

export interface Shot {
  id: string;
  session_id: string | null;
  player_id: string;
  shot_number: number;
  arc_degrees: number;
  depth_inches: number;
  lr_deviation_inches: number;
  shot_type: string;
  court_x_position: number | null;
  court_y_position: number | null;
  made: boolean;
  video_url: string | null;
  audio_feedback: string | null;
  ai_analysis_data: any;
  timestamp_in_session: number | null;
  created_at: string;
}

interface UseShotSessionsReturn {
  sessions: ShotSession[];
  currentSession: ShotSession | null;
  shots: Shot[];
  loading: boolean;
  error: string | null;
  createSession: () => Promise<string | null>;
  endSession: (sessionId: string) => Promise<boolean>;
  addShot: (sessionId: string, shotData: Omit<Shot, 'id' | 'created_at' | 'session_id' | 'player_id'>) => Promise<boolean>;
  refetch: () => void;
}

export const useShotSessions = (playerId?: string): UseShotSessionsReturn => {
  const [sessions, setSessions] = useState<ShotSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ShotSession | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSessions = async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch shot sessions - we'll need to create this table or derive from shots
      const { data: shots, error: shotsError } = await supabase
        .from('shots')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (shotsError) {
        throw shotsError;
      }

      // Group shots by session_id or by date if no session_id
      const sessionGroups = (shots || []).reduce((acc, shot) => {
        const sessionKey = shot.session_id || shot.created_at.split('T')[0];
        if (!acc[sessionKey]) {
          acc[sessionKey] = {
            shots: [],
            session_id: shot.session_id,
            date: shot.created_at.split('T')[0]
          };
        }
        acc[sessionKey].shots.push(shot);
        return acc;
      }, {} as Record<string, any>);

      // Convert to session objects
      const sessionsList: ShotSession[] = Object.entries(sessionGroups).map(([key, group]: [string, any]) => {
        const sessionShots = group.shots;
        const totalShots = sessionShots.length;
        const madeShots = sessionShots.filter((s: Shot) => s.made).length;
        const shootingPercentage = totalShots > 0 ? (madeShots / totalShots) * 100 : 0;
        const avgArc = totalShots > 0 ? sessionShots.reduce((sum: number, s: Shot) => sum + s.arc_degrees, 0) / totalShots : 0;
        const avgDepth = totalShots > 0 ? sessionShots.reduce((sum: number, s: Shot) => sum + s.depth_inches, 0) / totalShots : 0;

        return {
          id: group.session_id || `date-${group.date}`,
          player_id: playerId,
          session_date: group.date,
          total_shots: totalShots,
          made_shots: madeShots,
          shooting_percentage: shootingPercentage,
          avg_arc: avgArc,
          avg_depth: avgDepth,
          session_duration_minutes: 0, // Calculate if needed
          created_at: sessionShots[0]?.created_at || new Date().toISOString()
        };
      });

      setSessions(sessionsList);
      setShots(shots || []);

      // Check for active session (shots from today without session_id)
      const today = new Date().toISOString().split('T')[0];
      const todayShots = (shots || []).filter(shot => 
        shot.created_at.startsWith(today) && !shot.session_id
      );

      if (todayShots.length > 0) {
        const activeSession = sessionsList.find(s => s.session_date === today && s.id.startsWith('date-'));
        setCurrentSession(activeSession || null);
      }

    } catch (err: any) {
      console.error('Error fetching shot sessions:', err);
      setError(err.message || 'Failed to load shot sessions');
      toast({
        title: "Error",
        description: "Failed to load shot data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (): Promise<string | null> => {
    if (!playerId) return null;

    try {
      // For now, we'll use a simple session ID based on timestamp
      // In a full implementation, you might want a sessions table
      const sessionId = `session_${playerId}_${Date.now()}`;
      
      // Create a virtual session - shots will be added with this session_id
      const newSession: ShotSession = {
        id: sessionId,
        player_id: playerId,
        session_date: new Date().toISOString().split('T')[0],
        total_shots: 0,
        made_shots: 0,
        shooting_percentage: 0,
        avg_arc: 0,
        avg_depth: 0,
        session_duration_minutes: 0,
        created_at: new Date().toISOString()
      };

      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);

      toast({
        title: "Session Started",
        description: "New shooting session created",
      });

      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create shooting session",
        variant: "destructive",
      });
      return null;
    }
  };

  const endSession = async (sessionId: string): Promise<boolean> => {
    try {
      // Update session stats based on shots taken
      const sessionShots = shots.filter(shot => shot.session_id === sessionId);
      const totalShots = sessionShots.length;
      const madeShots = sessionShots.filter(shot => shot.made).length;

      setCurrentSession(null);
      
      // Update the session in our local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? {
              ...session,
              total_shots: totalShots,
              made_shots: madeShots,
              shooting_percentage: totalShots > 0 ? (madeShots / totalShots) * 100 : 0
            }
          : session
      ));

      toast({
        title: "Session Ended",
        description: `Session completed: ${madeShots}/${totalShots} shots made`,
      });

      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  };

  const addShot = async (sessionId: string, shotData: Omit<Shot, 'id' | 'created_at' | 'session_id' | 'player_id'>): Promise<boolean> => {
    if (!playerId) return false;

    try {
      const { error } = await supabase
        .from('shots')
        .insert({
          session_id: sessionId,
          player_id: playerId,
          shot_number: shotData.shot_number,
          arc_degrees: shotData.arc_degrees,
          depth_inches: shotData.depth_inches,
          lr_deviation_inches: shotData.lr_deviation_inches,
          shot_type: shotData.shot_type,
          court_x_position: shotData.court_x_position,
          court_y_position: shotData.court_y_position,
          made: shotData.made,
          video_url: shotData.video_url,
          audio_feedback: shotData.audio_feedback,
          ai_analysis_data: shotData.ai_analysis_data,
          timestamp_in_session: shotData.timestamp_in_session
        });

      if (error) throw error;

      // Refresh data to get the new shot
      await fetchSessions();

      return true;
    } catch (error) {
      console.error('Error adding shot:', error);
      toast({
        title: "Error",
        description: "Failed to save shot data",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [playerId]);

  return {
    sessions,
    currentSession,
    shots,
    loading,
    error,
    createSession,
    endSession,
    addShot,
    refetch: fetchSessions
  };
};