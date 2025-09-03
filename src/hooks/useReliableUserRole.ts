import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserRoleData {
  id: string;
  email: string;
  full_name: string;
  approval_status: string;
  primary_role: string;
  role_active: boolean;
  is_super_admin: boolean;
  all_roles: string[];
}

/**
 * Reliable user role hook that always fetches fresh data from the database
 * and avoids caching issues that can cause authorization problems.
 */
export const useReliableUserRole = () => {
  const [userData, setUserData] = useState<UserRoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  const fetchUserRole = useCallback(async (force = false) => {
    if (!user?.id || !session) {
      setUserData(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching user role for:', user.email, 'User ID:', user.id);

      // Use direct queries with better error handling
      const [profileQuery, rolesQuery] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, approval_status')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
      ]);

      if (profileQuery.error) {
        console.error('❌ Error fetching user profile:', profileQuery.error);
        setError(profileQuery.error.message);
        return;
      }

      if (rolesQuery.error) {
        console.error('❌ Error fetching user roles:', rolesQuery.error);
        setError(rolesQuery.error.message);
        return;
      }

      const profile = profileQuery.data;
      if (!profile) {
        console.error('❌ No profile found for user:', user.id);
        setError('User profile not found');
        return;
      }

      const roles = rolesQuery.data || [];
      const roleStrings = roles.map(r => r.role);
      
      const userData: UserRoleData = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        approval_status: profile.approval_status,
        primary_role: roleStrings[0] || 'player',
        role_active: roles.length > 0,
        is_super_admin: roleStrings.includes('super_admin'),
        all_roles: roleStrings
      };

      console.log('✅ Reliable user role data loaded:', userData);
      setUserData(userData);
    } catch (err) {
      console.error('Unexpected error fetching user role:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Subscribe to auth state changes with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state changed, refetching role:', event);
        
        // Clear current data
        setUserData(null);
        setError(null);
        
        // Debounce the refetch to prevent rapid calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchUserRole(true);
        }, 100);
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [fetchUserRole]);

  // Helper functions
  const hasRole = useCallback((role: string): boolean => {
    return userData?.all_roles?.includes(role) || false;
  }, [userData]);

  const isSuperAdmin = useCallback((): boolean => {
    return userData?.is_super_admin || false;
  }, [userData]);

  const isApproved = useCallback((): boolean => {
    return userData?.approval_status === 'approved';
  }, [userData]);

  const canAccess = useCallback((role: string): boolean => {
    return isApproved() && (isSuperAdmin() || hasRole(role));
  }, [isApproved, isSuperAdmin, hasRole]);

  return {
    userData,
    loading,
    error,
    refetch: fetchUserRole,
    // Helper functions
    hasRole,
    isSuperAdmin,
    isApproved,
    canAccess,
    // Convenience getters
    primaryRole: userData?.primary_role || null,
    allRoles: userData?.all_roles || [],
    userEmail: userData?.email || null,
    userName: userData?.full_name || null,
  };
};