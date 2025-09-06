import { useAuth } from '@/contexts/AuthContext';
import { useReliableUserRole } from '@/hooks/useReliableUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';

export const useCurrentUser = () => {
  const { user } = useAuth();
  const { primaryRole, isSuperAdmin, loading } = useReliableUserRole();
  const { isTestMode, effectiveRole, effectiveIsSuperAdmin } = useRoleSwitcher();

  // Don't process role data until roles are fully loaded
  if (loading) {
    return { 
      currentUser: {
        name: user?.user_metadata?.full_name || user?.email || 'User',
        role: 'Loading...',
        avatar: user?.user_metadata?.full_name 
          ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
          : 'U'
      }, 
      loading: true 
    };
  }

  // For role display: Only show test role if super admin is actively testing
  // Otherwise, always show the true role to prevent confusion
  const displayRole = isSuperAdmin() 
    ? (isTestMode && effectiveRole ? `Super Admin (Testing: ${effectiveRole})` : 'Super Admin')
    : primaryRole === 'connection_error' 
      ? 'Connection Error - Please Refresh'
      : (primaryRole ? primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1) : 'User');
  
  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || 'User',
    role: displayRole,
    avatar: user?.user_metadata?.full_name 
      ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
      : 'U'
  };

  return { currentUser, loading: false };
};