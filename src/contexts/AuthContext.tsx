import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ApprovalRequired } from '@/components/ApprovalRequired';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isApproved: boolean | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isApproved: null,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check approval status when user logs in
        if (session?.user) {
          setTimeout(() => {
            checkApprovalStatus(session.user.id);
          }, 0);
        } else {
          setIsApproved(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkApprovalStatus(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkApprovalStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking approval status:', error);
        setIsApproved(false);
        return;
      }

      setIsApproved(data.approval_status === 'approved');
    } catch (error) {
      console.error('Error checking approval status:', error);
      setIsApproved(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setIsApproved(null);
  };

  const value = {
    user,
    session,
    loading,
    isApproved,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Show approval screen for authenticated but unapproved users */}
      {user && isApproved === false ? <ApprovalRequired /> : children}
    </AuthContext.Provider>
  );
};