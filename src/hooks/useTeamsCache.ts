import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface Team {
  id: string;
  name: string;
  age_group: string;
  season: string;
  coach_id?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  } | null;
  _count?: {
    players: number;
  };
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

export const useTeamsCache = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry<Team[]>>>(new Map());
  const subscriptionRef = useRef<any>(null);

  const invalidateCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Fetch teams with caching
  const fetchTeams = useCallback(async (filters?: any) => {
    const cacheKey = `teams_${JSON.stringify(filters || {})}`;
    const cache = cacheRef.current;
    const entry = cache.get(cacheKey);
    
    // Check cache first
    if (entry && Date.now() <= entry.expiry) {
      setTeams(entry.data);
      setLoading(false);
      return entry.data;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch teams with coach profiles and player counts
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      if (!teamsData || teamsData.length === 0) {
        setTeams([]);
        return [];
      }

      // Get coach profiles for teams that have coaches
      const coachIds = teamsData
        .filter(team => team.coach_id)
        .map(team => team.coach_id);

      let coachProfiles: any[] = [];
      if (coachIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', coachIds);

        if (profilesError) {
          console.warn('Could not fetch coach profiles:', profilesError);
        } else {
          coachProfiles = profilesData || [];
        }
      }

      // Get player counts for each team using the player_teams junction table
      const { data: playerCounts, error: countError } = await supabase
        .from('player_teams')
        .select('team_id')
        .in('team_id', teamsData.map(t => t.id))
        .eq('is_active', true);

      if (countError) {
        console.warn('Could not fetch player counts:', countError);
      }

      // Create counts map
      const countsMap = new Map<string, number>();
      if (playerCounts) {
        playerCounts.forEach(assignment => {
          if (assignment.team_id) {
            countsMap.set(assignment.team_id, (countsMap.get(assignment.team_id) || 0) + 1);
          }
        });
      }

      // Create profiles map
      const profilesMap = new Map();
      coachProfiles.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine data
      const teamsWithData = teamsData.map(team => ({
        ...team,
        profiles: team.coach_id ? profilesMap.get(team.coach_id) || null : null,
        _count: {
          players: countsMap.get(team.id) || 0
        }
      }));

      // Cache the result
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      
      cache.set(cacheKey, {
        data: teamsWithData,
        timestamp: Date.now(),
        expiry: Date.now() + CACHE_EXPIRY
      });
      
      setTeams(teamsWithData);
      return teamsWithData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teams';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    subscriptionRef.current = supabase
      .channel('teams_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        () => {
          invalidateCache();
          fetchTeams().catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players'
        },
        () => {
          // Player changes affect team counts
          invalidateCache();
          fetchTeams().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [fetchTeams, invalidateCache]);

  // Initial fetch
  useEffect(() => {
    fetchTeams().catch(console.error);
  }, [fetchTeams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      invalidateCache();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [invalidateCache]);

  return {
    teams,
    loading,
    error,
    fetchTeams,
    invalidateCache,
    refetch: () => fetchTeams()
  };
};