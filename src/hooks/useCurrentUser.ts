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

  // Use effective role/admin status if in test mode, otherwise use actual role
  const actualIsSuperAdmin = isTestMode ? effectiveIsSuperAdmin : isSuperAdmin;
  const actualRole = isTestMode ? effectiveRole : userRole;

  // For super admin, always show "Super Admin" regardless of other roles
  // This ensures consistent role display across all pages
  const displayRole = actualIsSuperAdmin ? 'Super Admin' : (actualRole ? actualRole.charAt(0).toUpperCase() + actualRole.slice(1) : 'User');
  
  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email || 'User',
    role: displayRole,
    avatar: user?.user_metadata?.full_name 
      ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
      : 'U'
  };

  return { currentUser, loading: false };
};