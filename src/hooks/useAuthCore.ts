import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserAuthData {
  roles: string[];
  primaryRole: string;
  isApproved: boolean;
  teamIds: string[];
  profileData: any;
}

interface AuthCoreState {
  user: User | null;
  session: Session | null;
  userData: UserAuthData | null;
  loading: boolean;
  error: Error | null;
}

// Cache for auth data with TTL
const authCache = new Map<string, { data: UserAuthData; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const fetchUserAuthData = async (userId: string): Promise<UserAuthData | null> => {
  // Check cache first
  const cached = authCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_auth_data_secure', { target_user_id: userId });

    if (error) {
      console.error('[useAuthCore] Failed to fetch auth data:', error);
      return null;
    }

    // Type-safe data extraction
    const result = data as any;
    const authData: UserAuthData = {
      roles: Array.isArray(result?.roles) ? result.roles : [],
      primaryRole: typeof result?.primary_role === 'string' ? result.primary_role : 'player',
      isApproved: typeof result?.is_approved === 'boolean' ? result.is_approved : false,
      teamIds: Array.isArray(result?.team_ids) ? result.team_ids : [],
      profileData: result?.profile_data || {},
    };

    // Cache the result
    authCache.set(userId, { data: authData, timestamp: Date.now() });
    
    return authData;
  } catch (error) {
    console.error('[useAuthCore] Error fetching auth data:', error);
    return null;
  }
};

export const useAuthCore = () => {
  const [state, setState] = useState<AuthCoreState>({
    user: null,
    session: null,
    userData: null,
    loading: true,
    error: null,
  });

  const updateAuthState = useCallback(async (session: Session | null) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (session?.user) {
        const userData = await fetchUserAuthData(session.user.id);
        setState({
          user: session.user,
          session,
          userData,
          loading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          session: null,
          userData: null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('[useAuthCore] Error updating auth state:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Clear cache for current user
      if (state.user?.id) {
        authCache.delete(state.user.id);
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
    } catch (error) {
      console.error('[useAuthCore] Sign out error:', error);
      setState(prev => ({ ...prev, error: error as Error, loading: false }));
    }
  }, [state.user?.id]);

  const refetch = useCallback(() => {
    if (state.user?.id) {
      authCache.delete(state.user.id);
      updateAuthState(state.session);
    }
  }, [state.user?.id, state.session, updateAuthState]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await updateAuthState(session);
      } catch (error) {
        console.error('[useAuthCore] Initial session error:', error);
        setState(prev => ({ ...prev, loading: false, error: error as Error }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Use setTimeout to defer to avoid race conditions
        setTimeout(() => updateAuthState(session), 0);
      }
    );

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  return {
    ...state,
    signOut,
    refetch,
    // Helper functions
    hasRole: (role: string) => state.userData?.roles.includes(role) || false,
    isSuperAdmin: () => state.userData?.roles.includes('super_admin') || false,
    isApproved: () => state.userData?.isApproved || false,
    primaryRole: state.userData?.primaryRole || 'player',
  };
};