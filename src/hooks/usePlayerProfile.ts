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
  weight?: string; // Changed from number to string to match database
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

      // First, get basic player data (use actual column names)
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          name,
          jersey_number,
          position,
          height,
          weight
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (playerError) {
        throw playerError;
      }

      if (!playerData) {
        setProfile(null);
        return;
      }

      // Get user profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Get team data through player_teams relationship
      const { data: teamData } = await supabase
        .from('player_teams')
        .select(`
          teams:team_id (
            id,
            name
          )
        `)
        .eq('player_id', playerData.id)
        .eq('is_active', true)
        .maybeSingle();

      // Parse name field into first and last name if it exists
      const nameParts = playerData.name ? playerData.name.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Combine all data
      const combinedProfile = {
        ...playerData,
        first_name: firstName,
        last_name: lastName,
        team: teamData?.teams || null,
        user: profileData || { full_name: user.email, email: user.email }
      };

      setProfile(combinedProfile);
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