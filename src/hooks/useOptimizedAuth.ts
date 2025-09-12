import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserAuthData {
  profile: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    approval_status: string;
    rejection_reason?: string;
    latest_tryout_total?: number;
    latest_tryout_placement?: string;
    latest_tryout_date?: string;
  } | null;
  roles: string[];
  primaryRole: string | null;
  isSuperAdmin: boolean;
  isApproved: boolean;
  error?: string | null;
}

interface OptimizedAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  userData: UserAuthData | null;
  error: string | null;
}

// Cache with TTL
const authCache = new Map<string, { data: UserAuthData; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const useOptimizedAuth = () => {
  const [state, setState] = useState<OptimizedAuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    userData: null,
    error: null,
  });

  const authListenerRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserAuthData = useCallback(async (userId: string): Promise<UserAuthData | null> => {
    // Check cache first
    const cacheKey = `auth_${userId}`;
    const cached = authCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      // Single optimized database call
      const { data, error } = await supabase.rpc('get_user_auth_data_secure', {
        target_user_id: userId
      });

      if (error) {
        console.error('Failed to fetch user auth data:', error);
        return null;
      }

      if (!data) {
        return {
          profile: null,
          roles: [],
          primaryRole: null,
          isSuperAdmin: false,
          isApproved: false,
          error: 'No data returned'
        };
      }

      // Parse the JSON response safely
      const parsedData = data as any;
      const authData: UserAuthData = {
        profile: parsedData.profile || null,
        roles: parsedData.roles || [],
        primaryRole: parsedData.primaryRole || null,
        isSuperAdmin: parsedData.isSuperAdmin || false,
        isApproved: parsedData.isApproved || false,
        error: parsedData.error || null
      };

      // Cache the result
      authCache.set(cacheKey, {
        data: authData,
        timestamp: Date.now()
      });

      return authData;
    } catch (error) {
      console.error('Error fetching user auth data:', error);
      return null;
    }
  }, []);

  const updateAuthState = useCallback(async (session: Session | null) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!session?.user) {
      setState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
        userData: null,
        error: null,
      });
      return;
    }

    // Set timeout for auth data fetch (5 seconds max)
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Authentication timeout - please refresh',
      }));
    }, 5000);

    try {
      const userData = await fetchUserAuthData(session.user.id);
      
      // Clear timeout if successful
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setState({
        user: session.user,
        session: session,
        loading: false,
        initialized: true,
        userData: userData,
        error: userData?.error || null,
      });
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }));
    }
  }, [fetchUserAuthData]);

  useEffect(() => {
    // Clean up any existing listener
    if (authListenerRef.current) {
      authListenerRef.current.unsubscribe();
    }

    // Set up single auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only synchronous state updates here to prevent deadlocks
        if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
            userData: null,
            error: null,
          });
          return;
        }

        // Defer async auth data fetch
        setTimeout(() => {
          updateAuthState(session);
        }, 0);
      }
    );

    authListenerRef.current = subscription;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [updateAuthState]);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, []);

  const refetch = useCallback(() => {
    if (state.user?.id) {
      // Clear cache for this user
      const cacheKey = `auth_${state.user.id}`;
      authCache.delete(cacheKey);
      updateAuthState(state.session);
    }
  }, [state.user?.id, state.session, updateAuthState]);

  // Helper functions for compatibility
  const hasRole = useCallback((role: string): boolean => {
    return state.userData?.roles?.includes(role) || false;
  }, [state.userData?.roles]);

  const isSuperAdmin = useCallback((): boolean => {
    return state.userData?.isSuperAdmin || false;
  }, [state.userData?.isSuperAdmin]);

  const isApproved = useCallback((): boolean => {
    return state.userData?.isApproved || false;
  }, [state.userData?.isApproved]);

  const canAccess = useCallback((role: string): boolean => {
    if (!isApproved()) return false;
    return isSuperAdmin() || hasRole(role);
  }, [hasRole, isSuperAdmin, isApproved]);

  return {
    // Core auth state
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
    error: state.error,
    
    // User data
    userData: state.userData,
    primaryRole: state.userData?.primaryRole || null,
    userRoles: state.userData?.roles || [],
    
    // Helper functions
    hasRole,
    isSuperAdmin,
    isApproved,
    canAccess,
    
    // Actions
    signOut,
    refetch,
  };
};