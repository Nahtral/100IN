import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PlayerProfile {
  id: string;
  user_id: string;
  team_id?: string;
  first_name?: string;
  last_name?: string;
  jersey_number?: number;
  position?: string;
  height?: string;
  weight?: number;
  team?: {
    id: string;
    name: string;
  };
  user?: {
    full_name?: string;
    email?: string;
  };
}

interface UsePlayerProfileReturn {
  profile: PlayerProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePlayerProfile = (): UsePlayerProfileReturn => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const queryPromise = supabase
        .from('players')
        .select(`
          id,
          user_id,
          team_id,
          first_name,
          last_name,
          jersey_number,
          position,
          height,
          weight,
          teams:team_id (
            id,
            name
          ),
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const { data, error: queryError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (queryError) {
        throw queryError;
      }

      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching player profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile
  };
};