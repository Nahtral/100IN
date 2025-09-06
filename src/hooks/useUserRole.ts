import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

/**
 * Legacy hook wrapper for useOptimizedAuth to maintain compatibility
 * @deprecated Use useOptimizedAuth directly instead
 */
export const useUserRole = () => {
  const authData = useOptimizedAuth();
  
  return {
    userRole: authData.primaryRole,
    userRoles: authData.userRoles,
    primaryRole: authData.primaryRole,
    isSuperAdmin: authData.isSuperAdmin,
    hasRole: authData.hasRole,
    canAccessMedical: () => authData.hasRole('medical') || authData.isSuperAdmin(),
    canAccessPartners: () => authData.hasRole('partner') || authData.isSuperAdmin(),
    initialized: authData.initialized,
    loading: authData.loading,
    user: authData.user
  };
};