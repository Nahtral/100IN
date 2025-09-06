import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { ApprovalRequired } from '@/components/ApprovalRequired';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isApproved: boolean | null;
  signOut: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isApproved: null,
  signOut: async () => {},
  refetch: () => {},
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
  const authState = useOptimizedAuth();

  const value = {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isApproved: authState.isApproved(),
    signOut: authState.signOut,
    refetch: authState.refetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Show approval screen for authenticated but unapproved users */}
      {authState.user && !authState.isApproved() ? <ApprovalRequired /> : children}
    </AuthContext.Provider>
  );
};