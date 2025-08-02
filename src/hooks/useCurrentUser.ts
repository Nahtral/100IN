import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';

export const useCurrentUser = () => {
  const { user } = useAuth();
  const { userRole, isSuperAdmin, loading, initialized } = useUserRole();
  const { isTestMode, effectiveRole, effectiveIsSuperAdmin } = useRoleSwitcher();

  // Don't process role data until roles are fully initialized
  if (!initialized || loading) {
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
  const displayRole = isSuperAdmin 
    ? (isTestMode && effectiveRole ? `Super Admin (Testing: ${effectiveRole})` : 'Super Admin')
    : (userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User');
  
  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || 'User',
    role: displayRole,
    avatar: user?.user_metadata?.full_name 
      ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
      : 'U'
  };

  return { currentUser, loading: false };
};