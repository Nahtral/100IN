import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface ReliableAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isApproved: boolean | null;
  initialized: boolean;
}

export const useReliableAuth = () => {
  const [authState, setAuthState] = useState<ReliableAuthState>({
    user: null,
    session: null,
    loading: true,
    isApproved: null,
    initialized: false
  });

  const { handleError } = useErrorHandler({ component: 'useReliableAuth' });

  const checkApprovalStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking approval status:', error);
        return false;
      }

      return data.approval_status === 'approved';
    } catch (error) {
      handleError(error as Error, { action: 'checkApprovalStatus' });
      return false;
    }
  }, [handleError]);

  const updateAuthState = useCallback((session: Session | null) => {
    setAuthState(prev => ({
      ...prev,
      session,
      user: session?.user ?? null,
      loading: false,
      initialized: true
    }));

    if (session?.user) {
      checkApprovalStatus(session.user.id).then(isApproved => {
        setAuthState(prev => ({
          ...prev,
          isApproved
        }));
      });
    } else {
      setAuthState(prev => ({
        ...prev,
        isApproved: null
      }));
    }
  }, [checkApprovalStatus]);

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          updateAuthState(session);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        updateAuthState(session);
      }
    }).catch(error => {
      if (isMounted) {
        handleError(error, { action: 'getInitialSession' });
        setAuthState(prev => ({
          ...prev,
          loading: false,
          initialized: true
        }));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [updateAuthState, handleError]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        handleError(error, { action: 'signOut' });
      }
    } catch (error) {
      handleError(error as Error, { action: 'signOut' });
    }
  }, [handleError]);

  return {
    ...authState,
    signOut,
    refetch: () => updateAuthState(authState.session)
  };
};