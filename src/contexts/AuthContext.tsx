import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuthCore } from '@/hooks/useAuthCore';
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
  const authCore = useAuthCore();

  const value = {
    user: authCore.user,
    session: authCore.session,
    loading: authCore.loading,
    isApproved: authCore.isApproved(),
    signOut: authCore.signOut,
    refetch: authCore.refetch,
  };

  // Add null check guard
  if (authCore.error) {
    throw new Error(`Auth initialization failed: ${authCore.error.message}`);
  }

  return (
    <AuthContext.Provider value={value}>
      {/* Show approval screen for authenticated but unapproved users */}
      {authCore.user && !authCore.isApproved() ? <ApprovalRequired /> : children}
    </AuthContext.Provider>
  );
};